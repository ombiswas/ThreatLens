import { Router } from "express";
import {
  uploadDatasetHandler,
  getDatasetsHandler,
  getDatasetByIdHandler,
  deleteDatasetHandler
} from "../controllers/datasetController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { uploadCsv } from "../middlewares/upload.js";
import { ROLES } from "../utils/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const datasetsRouter = Router();

datasetsRouter.post(
  "/upload",
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  uploadCsv.single("file"),
  asyncHandler(uploadDatasetHandler)
);

datasetsRouter.get("/", authenticate, asyncHandler(getDatasetsHandler));

datasetsRouter.get("/:id", authenticate, asyncHandler(getDatasetByIdHandler));

datasetsRouter.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN),
  asyncHandler(deleteDatasetHandler)
);
