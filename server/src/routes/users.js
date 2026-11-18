import { Router } from "express";
import { getUsers, updateUserRole, updateUserStatus } from "../controllers/userController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { updateRoleSchema, updateStatusSchema } from "../validators/authValidators.js";
import { ROLES } from "../utils/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const usersRouter = Router();

// All user management routes require active Admin privileges
usersRouter.use(authenticate, authorize(ROLES.ADMIN));

usersRouter.get("/", asyncHandler(getUsers));

usersRouter.patch("/:id/role", validate({ body: updateRoleSchema }), asyncHandler(updateUserRole));

usersRouter.patch(
  "/:id/status",
  validate({ body: updateStatusSchema }),
  asyncHandler(updateUserStatus)
);
