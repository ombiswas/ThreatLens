import { z } from "zod";
import dotenv from "dotenv";

// Load local environment file if available
dotenv.config();

const KNOWN_WEAK_SECRETS = new Set([
  "super_secret_jwt_key_at_least_32_characters_long_for_tests",
  "default_insecure_key_change_in_production",
  "your_production_jwt_secret_must_be_at_least_32_chars_long",
  "12345678901234567890123456789012",
  "changeme"
]);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(65535))
      .default("5000"),
    CLIENT_URL: z.string().url().default("http://localhost:5173"),
    MONGO_URI: z.string().min(1, "MONGO_URI is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters in length"),
    JWT_EXPIRES_IN: z.string().default("1h"),
    ML_SERVICE_URL: z.string().url().default("http://localhost:7860"),
    ML_API_KEY: z.string().min(1, "ML_API_KEY is required"),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    BREVO_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    ALERT_EMAIL_TO: z.string().email().optional(),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info")
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      // 1. JWT_SECRET check
      const secretLower = data.JWT_SECRET.toLowerCase();
      if (
        KNOWN_WEAK_SECRETS.has(data.JWT_SECRET) ||
        secretLower.includes("for_tests") ||
        secretLower.includes("change_in_production")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message:
            "In production mode, JWT_SECRET cannot be a default, test, or placeholder secret"
        });
      }

      // 2. ML_API_KEY check
      if (data.ML_API_KEY === "default_insecure_key_change_in_production") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ML_API_KEY"],
          message:
            "In production mode, ML_API_KEY cannot be the default insecure placeholder key"
        });
      }

      // 3. ADMIN_EMAIL required in production
      if (!data.ADMIN_EMAIL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ADMIN_EMAIL"],
          message: "ADMIN_EMAIL is required when NODE_ENV=production"
        });
      }

      // 4. ADMIN_PASSWORD required in production with >= 12 chars
      if (!data.ADMIN_PASSWORD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ADMIN_PASSWORD"],
          message: "ADMIN_PASSWORD is required when NODE_ENV=production"
        });
      } else if (data.ADMIN_PASSWORD.length < 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ADMIN_PASSWORD"],
          message:
            "In production mode, ADMIN_PASSWORD must be at least 12 characters in length"
        });
      }
    }
  });

/**
 * Validates arbitrary environment variables object.
 * Useful for test suites and container health pre-checks.
 *
 * @param {object} rawEnv
 * @returns {object} Validated environment object
 */
export function validateEnvConfig(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const missingOrInvalid = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    const errMessage = `Invalid environment configuration:\n${missingOrInvalid.map((e) => `  - ${e}`).join("\n")}`;
    const err = new Error(errMessage);
    err.issues = result.error.issues;
    throw err;
  }
  return result.data;
}

export const env = validateEnvConfig(process.env);
