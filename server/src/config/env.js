import { z } from "zod";
import dotenv from "dotenv";

// Load local environment file if available
dotenv.config();

const envSchema = z.object({
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
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: report invalid variables without logging secret values
  const missingOrInvalid = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  console.error("FATAL: Environment validation failed:");
  missingOrInvalid.forEach((err) => console.error(`  - ${err}`));
  throw new Error("Invalid server environment configuration. Refusing to boot.");
}

export const env = parsed.data;
