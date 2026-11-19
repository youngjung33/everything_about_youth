import { z } from "zod";

/** 금융 저장 제도 id 병합 본문. */
export const mergeSavedSchemesBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

/** 금융 수집 쿼리. */
export const financeSyncQuerySchema = z.object({
  source: z.string().optional(),
});


