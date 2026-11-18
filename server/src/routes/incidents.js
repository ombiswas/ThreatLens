import { Router } from "express";
import {
  getIncidentsHandler,
  getIncidentByIdHandler,
  updateIncidentStatusHandler,
  addIncidentNoteHandler,
  exportIncidentsCsvHandler
} from "../controllers/incidentController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  incidentFilterQuerySchema,
  updateIncidentStatusSchema,
  addIncidentNoteSchema
} from "../validators/incidentValidators.js";
import { ROLES } from "../utils/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const incidentsRouter = Router();

// Export route placed first to prevent collision with /:id
incidentsRouter.get(
  "/export",
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  validate({ query: incidentFilterQuerySchema }),
  asyncHandler(exportIncidentsCsvHandler)
);

incidentsRouter.get(
  "/",
  authenticate,
  validate({ query: incidentFilterQuerySchema }),
  asyncHandler(getIncidentsHandler)
);

incidentsRouter.get("/:id", authenticate, asyncHandler(getIncidentByIdHandler));

incidentsRouter.patch(
  "/:id/status",
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  validate({ body: updateIncidentStatusSchema }),
  asyncHandler(updateIncidentStatusHandler)
);

incidentsRouter.post(
  "/:id/notes",
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN),
  validate({ body: addIncidentNoteSchema }),
  asyncHandler(addIncidentNoteHandler)
);
