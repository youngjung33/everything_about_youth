import { z } from "zod";

/** 생활 가이드 저장 id 병합 본문. */
export const mergeSavedGuidesBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

/** 생활 가이드 수집 쿼리. */
export const livingSyncQuerySchema = z.object({
  source: z.string().optional(),
});


