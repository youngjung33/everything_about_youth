import { z } from "zod";

export const mergeSavedBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

export const housingSyncQuerySchema = z.object({
  source: z.string().optional(),
});
