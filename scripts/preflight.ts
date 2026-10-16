/**
 * Production preflight (OP2).
 *
 * `src/config/env.ts` throws at module scope when required production variables
 * are missing — but the failure surfaces as an obscure "Failed to collect page
 * data" during `next build` or a dead middleware at runtime. This script runs
 * FIRST in `npm run build` so a missing variable fails the build in seconds with
 * a message naming the exact variable, instead of after minutes of compiling.
 *
 * - Local dev (`NODE_ENV !== production`): passes trivially.
 * - Vercel build: env vars are exposed at build time, so this validates the real
 *   dashboard configuration before a single page compiles.
 * - CI: run explicitly with production-like env (see `.github/workflows/ci.yml`).
 */
async function main(): Promise<void> {
  const started = Date.now();
  try {
    // tsx does NOT load .env files (only `next` does), while every other entry
    // point in this repo runs under Next. Load them with Next's own loader so
    // preflight validates exactly the environment `next build` / `next start`
    // would see — otherwise local builds fail on variables that are present.
    const { loadEnvConfig } = await import('@next/env');
    loadEnvConfig(process.cwd());
    const { env } = await import('@/config/env');
    const presented: Record<string, string> = {
      NODE_ENV: env.NODE_ENV,
      STORAGE_PROVIDER: String(env.STORAGE_PROVIDER ?? '(unset)'),
      NOTIFICATION_PROVIDER: env.NOTIFICATION_PROVIDER,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
      TRUST_PROXY: String(env.TRUST_PROXY),
      CRON_SECRET: env.CRON_SECRET ? '(set)' : '(MISSING)',
      WEBHOOK_SECRET: env.WEBHOOK_SECRET ? '(set)' : '(MISSING)',
      ENABLE_DEMO_WALLET: String(env.ENABLE_DEMO_WALLET),
    };
    if (env.NODE_ENV === 'production' && env.ENABLE_DEMO_WALLET) {
      throw new Error('ENABLE_DEMO_WALLET must not be true in production.');
    }
    console.log(`preflight ok (${Date.now() - started}ms):`, JSON.stringify(presented));
  } catch (error) {
    console.error(
      'preflight FAILED — refusing to build/boot with an invalid environment:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  }
}

void main();
