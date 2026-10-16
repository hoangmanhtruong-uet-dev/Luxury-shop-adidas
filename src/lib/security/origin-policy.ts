const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface OriginPolicyEnvironment {
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_URL?: string;
  API_ALLOWED_ORIGINS?: string;
  TRUST_PROXY?: string;
}

interface HeadersLike {
  get(name: string): string | null;
}

export interface OriginPolicyRequest {
  method: string;
  pathname: string;
  url: string;
  headers: HeadersLike;
}

export type OriginPolicyDecision =
  | { allowed: true; reason: 'safe-method' | 'not-api' | 'exempt' | 'validated'; exemption?: string }
  | { allowed: false; status: 403 | 503; code: string; message: string };

interface MutationExemption {
  pathname: string;
  methods: ReadonlySet<string>;
  reason: string;
}

/**
 * This list is deliberately exact and intentionally small.
 *
 * Health probes only expose GET handlers, so they are covered by the safe-method
 * rule and do not need a mutation exemption.
 *
 * Every entry below is a machine-to-machine POST that arrives from an external
 * payment provider. Such callers send NO browser `Origin` header, so without an
 * exemption the origin check would reject them with 403 ORIGIN_REQUIRED before
 * they ever reach their route handler. Each one carries independent
 * authentication that does not rely on browser cookies:
 *   - /api/webhook              -> timestamped HMAC-SHA256 (webhook-verifier.ts)
 *   - /api/payments/vnpay/ipn   -> HMAC-SHA512 signature check in the handler
 *   - /api/payments/payos/webhook -> payOS SDK `webhooks.verify()` signature check
 *
 * Do NOT add browser-facing routes here: the origin check is the CSRF defence.
 */
export const API_MUTATION_ORIGIN_EXEMPTIONS: readonly MutationExemption[] = [
  {
    pathname: '/api/webhook',
    methods: new Set(['POST']),
    reason: 'Payment-provider M2M callback authenticated by timestamped HMAC signature in its route handler.',
  },
  {
    pathname: '/api/payments/vnpay/ipn',
    methods: new Set(['POST']),
    reason: 'VNPay IPN is a server-to-server POST verified by HMAC-SHA512 signature inside the route handler.',
  },
  {
    pathname: '/api/payments/payos/webhook',
    methods: new Set(['POST']),
    reason: 'PayOS webhook is a server-to-server POST verified by the PayOS SDK signature check inside the route handler.',
  },
];

function canonicalPathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function normalizeOrigin(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Unsupported origin protocol');
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Origin must not contain credentials, a path, query, or fragment');
  }
  return parsed.origin;
}

export function parseAllowedOrigins(environment: OriginPolicyEnvironment):
  | { ok: true; origins: ReadonlySet<string> }
  | { ok: false; error: string } {
  const candidates: string[] = [];
  const configuredAllowlist = environment.API_ALLOWED_ORIGINS?.trim();

  if (configuredAllowlist) {
    const values = configuredAllowlist.split(',').map((value) => value.trim());
    if (values.some((value) => value.length === 0)) {
      return { ok: false, error: 'API_ALLOWED_ORIGINS contains an empty entry' };
    }
    candidates.push(...values);
  }

  if (!configuredAllowlist) {
    const appUrl = environment.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) candidates.push(appUrl);
  }

  if (environment.NODE_ENV === 'production' && candidates.length === 0) {
    return { ok: false, error: 'No production API origin is configured' };
  }

  try {
    return { ok: true, origins: new Set(candidates.map(normalizeOrigin)) };
  } catch {
    return { ok: false, error: 'An API origin is malformed' };
  }
}

function forwardedValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  return first || null;
}

function requestTargetOrigin(request: OriginPolicyRequest, trustProxy: boolean): string | null {
  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = trustProxy ? forwardedValue(request.headers.get('x-forwarded-host')) : null;
    const forwardedProto = trustProxy ? forwardedValue(request.headers.get('x-forwarded-proto')) : null;
    const host = forwardedHost ?? request.headers.get('host')?.trim() ?? requestUrl.host;
    const protocol = forwardedProto ? forwardedProto.replace(/:$/, '') + ':' : requestUrl.protocol;
    return normalizeOrigin(protocol + '//' + host);
  } catch {
    return null;
  }
}

export function getApiMutationOriginExemption(pathname: string, method: string): MutationExemption | undefined {
  const canonical = canonicalPathname(pathname);
  const normalizedMethod = method.toUpperCase();
  return API_MUTATION_ORIGIN_EXEMPTIONS.find(
    (entry) => entry.pathname === canonical && entry.methods.has(normalizedMethod),
  );
}

export function validateApiMutationOrigin(
  request: OriginPolicyRequest,
  environment: OriginPolicyEnvironment = process.env,
): OriginPolicyDecision {
  const method = request.method.toUpperCase();
  if (!MUTATING_METHODS.has(method)) return { allowed: true, reason: 'safe-method' };

  const pathname = canonicalPathname(request.pathname);
  if (pathname !== '/api' && !pathname.startsWith('/api/')) return { allowed: true, reason: 'not-api' };

  const exemption = getApiMutationOriginExemption(pathname, method);
  if (exemption) return { allowed: true, reason: 'exempt', exemption: exemption.reason };

  const configured = parseAllowedOrigins(environment);
  if (!configured.ok) {
    return {
      allowed: false,
      status: 503,
      code: 'ORIGIN_POLICY_MISCONFIGURED',
      message: 'API origin policy is not configured.',
    };
  }

  const targetOrigin = requestTargetOrigin(request, environment.TRUST_PROXY === 'true');
  if (!targetOrigin) {
    return { allowed: false, status: 403, code: 'INVALID_REQUEST_TARGET', message: 'Invalid request target.' };
  }

  const allowedOrigins = configured.origins.size > 0
    ? configured.origins
    : new Set([targetOrigin]);

  // The target itself must be a configured deployment origin. This prevents a
  // spoofed Host/X-Forwarded-Host from turning a matching Origin into a bypass.
  if (!allowedOrigins.has(targetOrigin)) {
    return { allowed: false, status: 403, code: 'REQUEST_TARGET_NOT_ALLOWED', message: 'Request target is not allowed.' };
  }

  const originHeader = request.headers.get('origin');
  if (!originHeader) {
    return { allowed: false, status: 403, code: 'ORIGIN_REQUIRED', message: 'Origin header is required.' };
  }

  let requestOrigin: string;
  try {
    requestOrigin = normalizeOrigin(originHeader.trim());
  } catch {
    return { allowed: false, status: 403, code: 'INVALID_ORIGIN', message: 'Invalid request origin.' };
  }

  if (!allowedOrigins.has(requestOrigin)) {
    return { allowed: false, status: 403, code: 'ORIGIN_NOT_ALLOWED', message: 'Request origin is not allowed.' };
  }

  return { allowed: true, reason: 'validated' };
}
