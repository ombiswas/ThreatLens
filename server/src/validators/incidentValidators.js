import { z } from "zod";
import { INCIDENT_STATUSES, RISK_LEVELS, ATTACK_CLASSES } from "../utils/constants.js";

export const incidentFilterQuerySchema = z
  .object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.enum(["detectedAt", "score", "riskLevel", "status", "mlClass"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    status: z.enum(Object.values(INCIDENT_STATUSES)).optional(),
    riskLevel: z.enum(Object.values(RISK_LEVELS)).optional(),
    mlClass: z.enum(Object.values(ATTACK_CLASSES)).optional(),
    class: z.enum(Object.values(ATTACK_CLASSES)).optional(),
    datasetId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid dataset ID")
      .optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().max(100).optional()
  })
  .strict();

export const updateIncidentStatusSchema = z
  .object({
    status: z.enum(Object.values(INCIDENT_STATUSES), {
      required_error: "Status is required"
    })
  })
  .strict();

export const addIncidentNoteSchema = z
  .object({
    text: z
      .string({ required_error: "Note text is required" })
      .min(1, "Note text cannot be empty")
      .max(1000, "Note text cannot exceed 1000 characters")
  })
  .strict();
