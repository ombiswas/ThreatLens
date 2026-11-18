import { Router } from "express";
import {
  startReplayHandler,
  stopReplayHandler,
  getReplayStatusHandler
} from "../controllers/replayController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { ROLES } from "../utils/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Replay is restricted to Analyst and Admin roles
router.use(authenticate, authorize(ROLES.ADMIN, ROLES.ANALYST));

router.post("/start", asyncHandler(startReplayHandler));
router.post("/stop", asyncHandler(stopReplayHandler));
router.get("/status", asyncHandler(getReplayStatusHandler));

export default router;
