import { z } from "zod";

export const mergeSavedPostingsBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

export const jobsSyncQuerySchema = z.object({
  source: z.string().optional(),
});
