import { Router } from "express";
import {
  getStatsSummaryHandler,
  getStatsTimelineHandler,
  getStatsDistributionHandler,
  getTopSourcesHandler
} from "../controllers/statsController.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Stats endpoints are accessible to all authenticated roles (Admin, Analyst, Viewer)
router.use(authenticate);

router.get("/summary", asyncHandler(getStatsSummaryHandler));
router.get("/timeline", asyncHandler(getStatsTimelineHandler));
router.get("/distribution", asyncHandler(getStatsDistributionHandler));
router.get("/top-sources", asyncHandler(getTopSourcesHandler));

export default router;
