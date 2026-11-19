import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { type SourceId } from "../domain/enums";
import { parseSourceList } from "../domain/sync-sources";

/** 자동 수집 간격 최솟값(분). 공공 API·기관 사이트 부담 완화 */
export const MIN_SYNC_INTERVAL_MINUTES = 30;

const schema = z.object({
  BENEFITS_SYNC_SOURCES: z.preprocess(emptyToUndefined, z.string().optional()),
  /** 0 이거나 비어 있으면 자동 수집 안 함 */
  BENEFITS_SYNC_INTERVAL_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),
  BENEFITS_ONTONG_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
});

/** 청년 혜택 섹션 전용 설정 */
export interface BenefitsConfig {
  /** 비어 있으면 등록된 모든 소스 */
  enabledSources: SourceId[];
  /** 자동 수집 간격(분). 0 이면 끔 */
  syncIntervalMinutes: number;
  ontongApiKey?: string;
}

/** 환경 변수에서 설정 로드 */
export function loadBenefitsConfig(env: Record<string, string | undefined> = process.env): BenefitsConfig {
  const parsed = schema.parse(env);
  const interval = parsed.BENEFITS_SYNC_INTERVAL_MINUTES;
  if (interval > 0 && interval < MIN_SYNC_INTERVAL_MINUTES) {
    throw new Error(`BENEFITS_SYNC_INTERVAL_MINUTES 는 0(끔) 또는 ${MIN_SYNC_INTERVAL_MINUTES} 이상이어야 합니다.`);
  }
  return {
    enabledSources: parseSourceList(parsed.BENEFITS_SYNC_SOURCES),
    syncIntervalMinutes: interval,
    ontongApiKey: parsed.BENEFITS_ONTONG_API_KEY,
  };
}
