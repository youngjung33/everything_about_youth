import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { type SourceId } from "../domain/enums";
import { parseSourceList } from "../domain/sync-sources";

/** 자동 수집 간격의 최솟값(분). 공공 API 와 기관 사이트에 부담을 주지 않기 위한 하한이다. */
export const MIN_SYNC_INTERVAL_MINUTES = 30;

const schema = z.object({
  LIVING_SYNC_SOURCES: z.preprocess(emptyToUndefined, z.string().optional()),
  LIVING_SYNC_INTERVAL_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),
});

/** LivingConfig */
export interface LivingConfig {
  enabledSources: SourceId[]; // enabledSources
  syncIntervalMinutes: number; // syncIntervalMinutes
}

/** loadLivingConfig 함수 */
export function loadLivingConfig(env: Record<string, string | undefined> = process.env): LivingConfig {
  const parsed = schema.parse(env);
  const interval = parsed.LIVING_SYNC_INTERVAL_MINUTES;
  if (interval > 0 && interval < MIN_SYNC_INTERVAL_MINUTES) {
    throw new Error(`LIVING_SYNC_INTERVAL_MINUTES 는 0(끔) 또는 ${MIN_SYNC_INTERVAL_MINUTES} 이상이어야 합니다.`);
  }
  return {
    enabledSources: parseSourceList(parsed.LIVING_SYNC_SOURCES),
    syncIntervalMinutes: interval,
  };
}
