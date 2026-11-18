import { z } from "zod";

export const datasetUploadSchema = z.object({
  name: z
    .string()
    .min(2, "Dataset name must be at least 2 characters")
    .max(100, "Dataset name cannot exceed 100 characters")
    .optional()
});
