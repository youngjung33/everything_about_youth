import { z } from "zod";

export const mergeSavedProgramsBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

export const benefitsSyncQuerySchema = z.object({
  source: z.string().optional(),
});
