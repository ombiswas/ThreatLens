import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:5000"),
  VITE_APP_ENV: z.enum(["development", "production", "test"]).default("development")
});

const parsed = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV
});

if (!parsed.success) {
  console.error("Invalid client environment configuration:", parsed.error.format());
  throw new Error("Client environment validation failed. Check .env file.");
}

export const env = parsed.data;
