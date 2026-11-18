import { Router } from "express";
import {
  getLatestEvaluationHandler,
  getDatasetEvaluationHandler
} from "../controllers/evaluationController.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Evaluation endpoints are accessible to authenticated users
router.use(authenticate);

router.get("/latest", asyncHandler(getLatestEvaluationHandler));
router.get("/dataset/:id", asyncHandler(getDatasetEvaluationHandler));

export default router;
