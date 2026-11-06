import { z } from "zod";

export const mergeSavedGuidesBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

export const livingSyncQuerySchema = z.object({
  source: z.string().optional(),
});
