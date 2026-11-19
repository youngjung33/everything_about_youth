import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { type SourceId } from "../domain/enums";
import { parseSourceList } from "../domain/sync-sources";

/** 자동 수집 간격의 최솟값(분). 공공 API 와 기관 사이트에 부담을 주지 않기 위한 하한이다. */
export const MIN_SYNC_INTERVAL_MINUTES = 30;

const schema = z.object({
  FINANCE_SYNC_SOURCES: z.preprocess(emptyToUndefined, z.string().optional()),
  /** 0 이거나 비어 있으면 자동 수집을 하지 않는다. */
  FINANCE_SYNC_INTERVAL_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),
  BENEFITS_ONTONG_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
});

/** 금융·자금 섹션 전용 설정 */
export interface FinanceConfig {
  /** 비어 있으면 등록된 모든 소스 */
  enabledSources: SourceId[];
  /** 자동 수집 간격(분). 0 이면 끈다. */
  syncIntervalMinutes: number;
  ontongApiKey?: string; // 온통 청년 API 키(선택)
}

/** 환경 변수에서 금융·자금 설정을 읽는다. */
export function loadFinanceConfig(env: Record<string, string | undefined> = process.env): FinanceConfig {
  const parsed = schema.parse(env);
  const interval = parsed.FINANCE_SYNC_INTERVAL_MINUTES;
  if (interval > 0 && interval < MIN_SYNC_INTERVAL_MINUTES) {
    throw new Error(`FINANCE_SYNC_INTERVAL_MINUTES 는 0(끔) 또는 ${MIN_SYNC_INTERVAL_MINUTES} 이상이어야 합니다.`);
  }
  return {
    enabledSources: parseSourceList(parsed.FINANCE_SYNC_SOURCES),
    syncIntervalMinutes: interval,
    ontongApiKey: parsed.BENEFITS_ONTONG_API_KEY,
  };
}
