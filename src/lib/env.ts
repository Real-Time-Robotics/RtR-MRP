import { z } from "zod";
import { logger } from "@/lib/logger";

const envSchema = z.object({
  // ============================================================
  // Database
  // ============================================================
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // ============================================================
  // Auth
  // ============================================================
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  AUTH_SECRET: z.string().optional(),

  // ============================================================
  // AI/LLM
  // ============================================================
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_BASE_URL: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_BASE_URL: z.string().optional(),

  // ============================================================
  // Email/SMTP
  // ============================================================
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

  // ============================================================
  // Infrastructure (Redis, Logging, Monitoring, etc.)
  // ============================================================
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
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

  // ============================================================
  // AWS / S3
  // ============================================================
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  // ============================================================
  // Public URLs
  // ============================================================
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_SOCKET_URL: z.string().optional(),

  // ============================================================
  // Node / Build / Testing
  // ============================================================
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  HOSTNAME: z.string().optional(),
  POD_NAME: z.string().optional(),
  PLAYWRIGHT_TEST: z.string().optional(),
  E2E_TEST: z.string().optional(),
  SKIP_RATE_LIMIT: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Derive the inferred type so consumers get full type-safety
// ---------------------------------------------------------------------------
export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Optional-variable categories for development warnings
// ---------------------------------------------------------------------------
const optionalVarCategories: Record<string, string[]> = {
  "AI/LLM": [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_API_BASE_URL",
    "GOOGLE_AI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_AI_API_BASE_URL",
  ],
  "Email/SMTP": [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_SECURE",
    "SMTP_FROM",
    "EMAIL_FROM_ADDRESS",
    "EMAIL_FROM_NAME",
    "EMAIL_PROVIDER",
    "RESEND_API_KEY",
    "SENDGRID_API_KEY",
    "AWS_SES_ACCESS_KEY_ID",
    "AWS_SES_SECRET_ACCESS_KEY",
  ],
  "Infrastructure": [
    "REDIS_URL",
    "REDIS_HOST",
    "REDIS_PORT",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "SENTRY_DSN",
    "ML_SERVICE_URL",
    "CRON_SECRET",
  ],
  "AWS/S3": [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "AWS_S3_BUCKET",
    "S3_BUCKET",
  ],
  "Public URLs": [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SOCKET_URL",
  ],
};

// ---------------------------------------------------------------------------
// Validate and export
// ---------------------------------------------------------------------------
function validateEnv(): Env {
  // Skip strict validation during build phase (next build collects page data
  // but secrets are not available at build time on platforms like Render)
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");

    if (isBuildPhase) {
      logger.warn(
        `Environment validation skipped during build:\n${message}`
      );
    } else if (process.env.NODE_ENV === "production") {
      throw new Error(`Environment validation failed:\n${message}`);
    } else {
      logger.warn(`Environment validation warnings:\n${message}`);
    }
  }

  // In development mode, log warnings for missing optional variables so
  // developers know which features will be unavailable.
  if (process.env.NODE_ENV === "development" && !isBuildPhase) {
    const missing: string[] = [];

    for (const [category, vars] of Object.entries(optionalVarCategories)) {
      const unset = vars.filter(
        (v) => !process.env[v] || process.env[v] === ""
      );
      if (unset.length > 0) {
        missing.push(`  [${category}] ${unset.join(", ")}`);
      }
    }

    if (missing.length > 0) {
      logger.warn(
        `Missing optional environment variables (related features may be unavailable):\n${missing.join("\n")}`
      );
    }
  }

  return result.success
    ? result.data
    : (process.env as unknown as Env);
}

export const env = validateEnv();
