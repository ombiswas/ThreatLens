import { Router } from "express";
import {
  getNotificationsHandler,
  markNotificationAsReadHandler,
  markAllNotificationsAsReadHandler
} from "../controllers/notificationController.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get("/", asyncHandler(getNotificationsHandler));
router.patch("/read-all", asyncHandler(markAllNotificationsAsReadHandler));
router.patch("/:id/read", asyncHandler(markNotificationAsReadHandler));

export default router;
