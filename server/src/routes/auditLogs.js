import { Router } from "express";
import { getAuditLogsController } from "../controllers/auditController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { ROLES } from "../utils/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const auditLogsRouter = Router();

// Audit log retrieval requires active Admin privileges
auditLogsRouter.use(authenticate, authorize(ROLES.ADMIN));

auditLogsRouter.get("/", asyncHandler(getAuditLogsController));
