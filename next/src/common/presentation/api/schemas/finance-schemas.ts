import { z } from "zod";

export const mergeSavedSchemesBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

export const financeSyncQuerySchema = z.object({
  source: z.string().optional(),
});
