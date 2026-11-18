import { z } from "zod";

/**
 * Zod schema for public user registration.
 * Mass-assignment of role is strictly rejected via .strict().
 */
export const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .email("Must be a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
    password: z
      .string({ required_error: "Password is required" })
      .min(10, "Password must be at least 10 characters")
      .max(128, "Password cannot exceed 128 characters")
  })
  .strict();

/**
 * Zod schema for user authentication / login.
 */
export const loginSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .email("Must be a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .max(128, "Password cannot exceed 128 characters")
  })
  .strict();

/**
 * Zod schema for role update (Admin only).
 */
export const updateRoleSchema = z
  .object({
    role: z.enum(["admin", "analyst", "viewer", "Admin", "Analyst", "Viewer"], {
      required_error: "Role is required"
    })
  })
  .strict();

/**
 * Zod schema for status update (Admin only).
 */
export const updateStatusSchema = z
  .object({
    isActive: z.boolean({ required_error: "isActive boolean is required" })
  })
  .strict();
