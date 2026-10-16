import { z } from 'zod';
import { parseRefreshTokenTtlSeconds } from './refresh-token';

const refreshTokenTtlSchema = z.string().optional().transform((value, context) => {
  try {
    return parseRefreshTokenTtlSeconds(value, process.env.NODE_ENV);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invalid REFRESH_TOKEN_TTL',
    });
    return z.NEVER;
  }
});

const booleanString = z.enum(['true', 'false']).transform(value => value === 'true');

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  // Direct (non-pooled) connection for migrations. Optional at runtime boot so a
  // serverless instance serving traffic never hard-requires it; `db:deploy` and
  // `db:migrate` fail loudly without it via Prisma itself.
  DIRECT_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).optional(),
  UPLOAD_DIR: z.string().default('public/uploads'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Email (Resend.com — recommended)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_ADDRESS: z.string().optional(),

  // VNPay Payment Gateway
  VNPAY_TMN_CODE: z.string().optional(),
  VNPAY_HASH_SECRET: z.string().optional(),
  VNPAY_URL: z.string().url().optional(),
  VNPAY_RETURN_URL: z.string().url().optional(),
  VNPAY_IPN_URL: z.string().url().optional(),

  // Optional but recommended
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // NOTE: storage folder keeps the legacy 'mtruong-store' value on purpose —
  // existing Cloudinary assets live under it and renaming would break their URLs.
  CLOUDINARY_FOLDER: z.string().default('mtruong-store'),
  
  // Access token TTL uses jose duration syntax; refresh token TTL is integer seconds.
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: refreshTokenTtlSchema,
  
  // Upload
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  UPLOAD_MAX_FILES_PER_REQUEST: z.coerce.number().int().positive().default(5),
  UPLOAD_DAILY_FILE_LIMIT: z.coerce.number().int().positive().default(50),
  UPLOAD_DAILY_BYTE_LIMIT: z.coerce.number().int().positive().default(50 * 1024 * 1024),
  UPLOAD_REQUEST_LIMIT: z.coerce.number().int().positive().default(5),

  // Forwarded client IP headers are ignored unless a trusted proxy is configured.
  TRUST_PROXY: booleanString.default('false'),
  RATE_LIMIT_TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).default(1),

  // Cron authentication (Phase 2.5). Previously read straight from process.env
  // in two route handlers and absent from the schema, so an unset value produced
  // the literal expected header "Bearer undefined" and every cron returned 401 —
  // the outbox silently stopped draining.
  CRON_SECRET: z.string().min(32).optional(),

  // Payment providers (Phase 2.5): previously read raw from process.env, so a
  // typo failed silently at request time instead of at boot.
  PAYOS_CLIENT_ID: z.string().min(1).optional(),
  PAYOS_API_KEY: z.string().min(1).optional(),
  PAYOS_CHECKSUM_KEY: z.string().min(1).optional(),

  // Webhooks / CSRF (Phase 2.5)
  WEBHOOK_SECRET: z.string().min(32).optional(),
  WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  API_ALLOWED_ORIGINS: z.string().optional(),

  // Supabase Google OAuth (Phase 2.5)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // Analytics (public by design, but validated so typos surface at boot)
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_TIKTOK_PIXEL_ID: z.string().optional(),

  // Production safety switches
  NOTIFICATION_PROVIDER: z.enum(['log', 'webhook']).default('log'),
  // OP9: deploy-time kill switch. The DB-backed `siteconfig.maintenanceMode`
  // toggle is display-only (no middleware/route ever reads it); THIS variable is
  // what the middleware enforces. Set `MAINTENANCE_MODE=true` on the dashboard
  // and redeploy/restart to shed traffic during an incident.
  MAINTENANCE_MODE: booleanString.default('false'),
  // Phase 1.2: the demo wallet top-up is a development-only facility. When unset
  // on production it is denied; only an explicit opt-in re-enables it.
  ENABLE_DEMO_WALLET: booleanString.default('false'),
  DEMO_SEED_ENABLED: booleanString.default('false'),
  DEMO_SELLER_SETUP_ENABLED: booleanString.default('false'),
}).superRefine((data, context) => {
  if (data.NODE_ENV !== 'production') return;

  if (!data.STORAGE_PROVIDER) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['STORAGE_PROVIDER'], message: 'STORAGE_PROVIDER must be explicit in production' });
  } else if (data.STORAGE_PROVIDER === 'local') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['STORAGE_PROVIDER'], message: 'Local storage is not allowed in production' });
  } else if (data.STORAGE_PROVIDER === 's3') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['STORAGE_PROVIDER'], message: 'S3 storage adapter is not implemented; use cloudinary or an implemented durable provider' });
  }

  if (data.STORAGE_PROVIDER === 'cloudinary' && (!data.CLOUDINARY_CLOUD_NAME || !data.CLOUDINARY_API_KEY || !data.CLOUDINARY_API_SECRET)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['STORAGE_PROVIDER'], message: 'Cloudinary production storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET' });
  }

  if (data.NOTIFICATION_PROVIDER === 'log') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['NOTIFICATION_PROVIDER'], message: 'Log notification provider is not allowed in production' });
  }

  // Phase 2.5 (Critical #11): without CRON_SECRET both cron endpoints reject
  // every request forever and the outbox silently stops draining.
  if (!data.CRON_SECRET) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['CRON_SECRET'], message: 'CRON_SECRET (>= 32 chars) is required in production' });
  }

  // Phase 2.5 (Critical #13): with TRUST_PROXY=false every request collapses to
  // the single identity "direct-client", so /api/auth/login's 5-per-15-minutes
  // budget becomes 5 logins for the ENTIRE site.
  if (!data.TRUST_PROXY) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['TRUST_PROXY'],
      message: 'TRUST_PROXY must be true in production when deployed behind a proxy; otherwise rate limiting collapses to one global bucket',
    });
  }

  if (data.WEBHOOK_SECRET === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['WEBHOOK_SECRET'], message: 'WEBHOOK_SECRET (>= 32 chars) is required in production' });
  }

  if (data.DEMO_SEED_ENABLED) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['DEMO_SEED_ENABLED'], message: 'Demo seed is not allowed in production' });
  }

  if (data.DEMO_SELLER_SETUP_ENABLED) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['DEMO_SELLER_SETUP_ENABLED'], message: 'Demo seller setup is not allowed in production' });
  }

  const appUrl = new URL(data.NEXT_PUBLIC_APP_URL);
  if (appUrl.protocol !== 'https:') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['NEXT_PUBLIC_APP_URL'], message: 'NEXT_PUBLIC_APP_URL must be HTTPS in production' });
  }
});

const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
// Next imports route modules while compiling. Supply inert values only for that
// compilation phase so runtime secrets are neither required nor baked into the
// image; the real server process still validates its own environment below.
const buildEnvironment = isProductionBuild
  ? {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://build:build@localhost:5432/build',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'build-only-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'build-only-refresh-secret-at-least-32-characters',
      REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL ?? '604800',
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? 'cloudinary',
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? 'build_dummy',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '1234567890',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? 'build_dummy_secret',
      NOTIFICATION_PROVIDER: process.env.NOTIFICATION_PROVIDER ?? 'webhook',
      NOTIFICATION_EMAIL_WEBHOOK_URL: process.env.NOTIFICATION_EMAIL_WEBHOOK_URL ?? 'https://notify.example.com/email',
      NOTIFICATION_ALLOWED_HOSTS: process.env.NOTIFICATION_ALLOWED_HOSTS ?? 'notify.example.com',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com',
      // Phase 2.5: the production guards below must be satisfiable during
      // compilation, otherwise `next build` cannot even collect page data. These
      // inert values apply ONLY while `NEXT_PHASE === 'phase-production-build'`;
      // the serving process re-validates the real environment below and refuses
      // to boot if any of them is genuinely missing.
      CRON_SECRET: process.env.CRON_SECRET ?? 'build-only-cron-secret-at-least-32-characters',
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? 'build-only-webhook-secret-at-least-32-characters',
      TRUST_PROXY: process.env.TRUST_PROXY ?? 'true',
    }
  : process.env;
const parsed = envSchema.safeParse(buildEnvironment);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
