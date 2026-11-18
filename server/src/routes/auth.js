import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, getMe, logout } from "../controllers/authController.js";
import { validate } from "../middlewares/validate.js";
import { registerSchema, loginSchema } from "../validators/authValidators.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";

export const authRouter = Router();

// Strict rate limiting on authentication routes (brute-force defense)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === "test" ? 1000 : 20, // 20 requests per 15 min outside test
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again after 15 minutes."
    }
  }
});

authRouter.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(register)
);

authRouter.post("/login", authLimiter, validate({ body: loginSchema }), asyncHandler(login));

authRouter.get("/me", authenticate, asyncHandler(getMe));

authRouter.post("/logout", authenticate, asyncHandler(logout));
