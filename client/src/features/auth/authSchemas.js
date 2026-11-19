import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password cannot exceed 128 characters")
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .max(128, "Password cannot exceed 128 characters")
      .refine((val) => /[A-Z]/.test(val), {
        message: "Password must contain at least one uppercase letter"
      })
      .refine((val) => /[a-z]/.test(val), {
        message: "Password must contain at least one lowercase letter"
      })
      .refine((val) => /[0-9]/.test(val), {
        message: "Password must contain at least one numeric digit"
      })
      .refine((val) => /[^A-Za-z0-9]/.test(val), {
        message: "Password must contain at least one special symbol"
      }),
    confirmPassword: z.string().min(1, "Please confirm your password")
  })
  .refine((data) => data.password !== data.email.trim().toLowerCase(), {
    message: "Password cannot be identical to your email address",
    path: ["password"]
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });
