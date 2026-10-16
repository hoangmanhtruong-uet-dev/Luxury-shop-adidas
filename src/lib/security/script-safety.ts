const DEMO_DATABASE_HINTS = [/localhost/i, /127\.0\.0\.1/i, /_test(?:\?|$)/i, /test(?:\?|$)/i, /demo(?:\?|$)/i, /dev(?:elopment)?(?:\?|$)/i];

export interface DemoScriptGuardOptions {
  scriptName: string;
  optInEnv: string;
  databaseUrl?: string;
  allowProduction?: boolean;
}

export function assertDemoScriptMayMutateDatabase(options: DemoScriptGuardOptions): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL ?? '';
  const optIn = process.env[options.optInEnv] === 'true';

  if (nodeEnv === 'production' && !options.allowProduction) {
    throw new Error(`${options.scriptName} is blocked in production`);
  }

  if (!optIn) {
    throw new Error(`${options.scriptName} requires ${options.optInEnv}=true before mutating the database`);
  }

  // Narrow escape hatch for a deliberate, operator-confirmed remote seed (e.g. a
  // fresh empty Supabase used as dev/staging). The operator must name the exact
  // target hostname — a leaked/confused DATABASE_URL can never satisfy this by
  // accident. Production block above still applies unless allowProduction.
  const confirmHost = process.env.SEED_CONFIRM_HOST?.trim().toLowerCase();
  if (confirmHost) {
    let host = '';
    try {
      host = new URL(databaseUrl).hostname.toLowerCase();
    } catch {
      host = '';
    }
    if (host && host === confirmHost) return;
    throw new Error(
      `${options.scriptName}: SEED_CONFIRM_HOST=${confirmHost} does not match database host ${host || '(unparseable)'}`,
    );
  }

  if (!databaseUrl || !DEMO_DATABASE_HINTS.some(pattern => pattern.test(databaseUrl))) {
    throw new Error(`${options.scriptName} requires a development/test/demo database URL`);
  }
}

export function requireConfiguredSecret(value: string | undefined, name: string, minimumLength = 12): string {
  const secret = value?.trim();
  if (!secret || secret.length < minimumLength) {
    throw new Error(`${name} must be explicitly configured and at least ${minimumLength} characters`);
  }
  return secret;
}
