import { z } from "zod";

/** 혜택 저장 프로그램 id 병합 본문. */
export const mergeSavedProgramsBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

/** 혜택 수집 쿼리. */
export const benefitsSyncQuerySchema = z.object({
  source: z.string().optional(),
});


