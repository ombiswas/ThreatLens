import { z } from "zod";

export const startReplaySchema = z
  .object({
    datasetId: z.string({ required_error: "datasetId is required" }).min(1),
    ratePerSecond: z
      .number({ invalid_type_error: "ratePerSecond must be a number" })
      .int("ratePerSecond must be an integer")
      .min(1, "ratePerSecond must be at least 1")
      .max(50, "ratePerSecond cannot exceed 50")
      .optional()
      .default(10)
  })
  .strict();
