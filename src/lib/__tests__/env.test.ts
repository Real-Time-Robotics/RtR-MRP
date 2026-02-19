import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// We cannot simply import `env` from '@/lib/env' because the module executes
// validateEnv() at import time, reading process.env. Instead we re-create
// the schema here and test the validation logic in isolation. This avoids
// import-time side-effects while still providing full coverage of the Zod
// schema and the validation behaviour.
// ---------------------------------------------------------------------------

// Mock the logger used by env.ts
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Replicate the schema from env.ts so we can test it in isolation
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  AUTH_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_BASE_URL: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_BASE_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOG_FORMAT: z.string().optional(),
  LOG_SERVICE_URL: z.string().optional(),
  SERVICE_NAME: z.string().optional(),
  APP_VERSION: z.string().optional(),
  APP_PORT: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ML_SERVICE_URL: z.string().optional(),
  BACKUP_DIR: z.string().optional(),
  BACKUP_RETENTION_DAYS: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ENABLE_PROFILING: z.string().optional(),
  ENABLE_SUPABASE_SSO: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_SOCKET_URL: z.string().optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),
  HOSTNAME: z.string().optional(),
  POD_NAME: z.string().optional(),
  PLAYWRIGHT_TEST: z.string().optional(),
  E2E_TEST: z.string().optional(),
  SKIP_RATE_LIMIT: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

/** Minimal valid env for schema tests */
const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXTAUTH_SECRET: 'super-secret-key',
};

// =============================================================================
// Schema validation tests
// =============================================================================

describe('env schema validation', () => {
  it('should pass with all required variables present', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it('should fail when DATABASE_URL is missing', () => {
    const { DATABASE_URL, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.DATABASE_URL).toBeDefined();
    }
  });

  it('should fail when DATABASE_URL is empty string', () => {
    const result = envSchema.safeParse({ ...validEnv, DATABASE_URL: '' });
    expect(result.success).toBe(false);
  });

  it('should fail when NEXTAUTH_URL is not a valid URL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NEXTAUTH_URL: 'not-a-url',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.NEXTAUTH_URL).toBeDefined();
    }
  });

  it('should fail when NEXTAUTH_SECRET is missing', () => {
    const { NEXTAUTH_SECRET, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should default NODE_ENV to "development" when not set', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
    }
  });

  it('should accept NODE_ENV = "production"', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'production',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('production');
    }
  });

  it('should accept NODE_ENV = "test"', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('test');
    }
  });

  it('should reject invalid NODE_ENV value', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'staging',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid LOG_LEVEL values', () => {
    for (const level of ['debug', 'info', 'warn', 'error']) {
      const result = envSchema.safeParse({ ...validEnv, LOG_LEVEL: level });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid LOG_LEVEL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      LOG_LEVEL: 'verbose',
    });
    expect(result.success).toBe(false);
  });

  it('should allow all optional fields to be omitted', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ANTHROPIC_API_KEY).toBeUndefined();
      expect(result.data.SMTP_HOST).toBeUndefined();
      expect(result.data.REDIS_URL).toBeUndefined();
    }
  });

  it('should pass with optional fields populated', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      ANTHROPIC_API_KEY: 'sk-ant-xxx',
      OPENAI_API_KEY: 'sk-xxx',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      REDIS_URL: 'redis://localhost:6379',
      APP_PORT: '3000',
    });
    expect(result.success).toBe(true);
  });

  it('should treat APP_PORT and SMTP_PORT as strings (not numbers)', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      APP_PORT: '8080',
      SMTP_PORT: '465',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // The schema defines these as z.string(), not z.coerce.number()
      expect(typeof result.data.APP_PORT).toBe('string');
      expect(typeof result.data.SMTP_PORT).toBe('string');
    }
  });
});

// =============================================================================
// validateEnv behaviour tests (dynamic import to control process.env)
// =============================================================================

describe('validateEnv behaviour', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  it('should throw in production when required vars are missing', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PHASE: '',
      DATABASE_URL: '',
      NEXTAUTH_URL: '',
      NEXTAUTH_SECRET: '',
    };

    await expect(async () => {
      await import('@/lib/env');
    }).rejects.toThrow(/Environment validation failed/);
  });

  it('should NOT throw during build phase even if vars are missing', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PHASE: 'phase-production-build',
      DATABASE_URL: '',
      NEXTAUTH_URL: '',
      NEXTAUTH_SECRET: '',
    };

    // Should not throw - it warns instead
    await expect(import('@/lib/env')).resolves.toBeDefined();
  });

  it('should warn in development when validation fails (not throw)', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      NEXT_PHASE: '',
      DATABASE_URL: '',
      NEXTAUTH_URL: 'not-a-url',
      NEXTAUTH_SECRET: '',
    };

    const { logger } = await import('@/lib/logger');
    // Should not throw in development mode
    await expect(import('@/lib/env')).resolves.toBeDefined();
  });
});
