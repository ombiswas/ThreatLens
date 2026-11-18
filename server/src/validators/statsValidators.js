import { z } from "zod";

export const timelineQuerySchema = z
  .object({
    interval: z.enum(["minute", "hour", "day"]).optional().default("hour"),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional()
  })
  .strict();

export const topSourcesQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 5))
      .pipe(z.number().min(1).max(20))
  })
  .strict();
