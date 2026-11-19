import { z } from "zod";

/** 일자리 저장 공고 id 병합 본문. */
export const mergeSavedPostingsBodySchema = z.object({
  ids: z.array(z.string().trim().min(1)),
});

/** 일자리 수집 쿼리. */
export const jobsSyncQuerySchema = z.object({
  source: z.string().optional(),
});


