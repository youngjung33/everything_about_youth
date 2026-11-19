import { z } from "zod";

/** 임대주택 저장 id 목록 병합 본문. */
export const mergeSavedBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

/** 임대주택 수집 쿼리(source 등). */
export const housingSyncQuerySchema = z.object({
  source: z.string().optional(),
});


