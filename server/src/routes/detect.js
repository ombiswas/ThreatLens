import { Router } from "express";
import { detectController } from "../controllers/detectController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { detectRequestSchema } from "../validators/detectValidators.js";
import { ROLES } from "../utils/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const detectRouter = Router();

// Endpoint restricted to Analyst and Admin roles
detectRouter.post(
  "/",
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  validate({ body: detectRequestSchema }),
  asyncHandler(detectController)
);
