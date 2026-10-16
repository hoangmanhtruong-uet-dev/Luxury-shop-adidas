import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Phase 3.4 (Warning W10): the Supabase client was created with no timeout.
 * `@supabase/auth-js` has no built-in timeout, and Node/undici's default headers
 * timeout is 300s — a hung Supabase call held the whole serverless invocation for
 * five minutes. Every call is now bounded with AbortSignal.
 *
 * The previous `|| 'https://dummy.supabase.co'` / `|| 'dummy'` fallbacks turned a
 * configuration error into a confusing DNS failure, so missing configuration now
 * throws a message that names the actual variable.
 */

/**
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` into the browser bundle when
 * it is accessed as a STATIC property (`process.env.NEXT_PUBLIC_SUPABASE_URL`).
 * The previous implementation looked the value up dynamically
 * (`process.env[name]`), which the bundler leaves untouched — so in the browser
 * it resolved to `undefined` and `requiredPublic()` threw on module load. That
 * took down every page that imported this module, including `/login`, with a 500
 * (`NEXT_PUBLIC_SUPABASE_URL is not configured`). Read the values statically here
 * so the bundler can replace them.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const SUPABASE_TIMEOUT_MS = 8_000;

let cachedClient: SupabaseClient | null = null;

/**
 * Create (once) the Supabase client.
 *
 * The configuration check is deferred until the client is actually needed, and
 * the throw is raised here instead of at module scope. Google OAuth is a *bonus*
 * on top of the primary email/password login, which never touches Supabase — a
 * missing OAuth config must not blank out the login form.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured. ' +
        'Set them in the deployment environment to enable Google OAuth.',
    );
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS) }),
    },
  });

  return cachedClient;
}

/**
 * Lazy proxy so existing `supabase.auth.*` call sites keep working unchanged:
 * the real client is only created — and only then can config validation fail —
 * on first property access, instead of at module import time.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
