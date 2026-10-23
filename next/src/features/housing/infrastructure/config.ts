import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { SOURCE_IDS, type SourceId } from "../domain/enums";

/** 자동 수집 간격의 최솟값(분). 공공 API 와 기관 사이트에 부담을 주지 않기 위한 하한이다. */
export const MIN_SYNC_INTERVAL_MINUTES = 30;

const schema = z.object({
  HOUSING_SYNC_SOURCES: z.preprocess(emptyToUndefined, z.string().optional()),
  /** 0 이거나 비어 있으면 자동 수집을 하지 않는다. */
  HOUSING_SYNC_INTERVAL_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),
});

/** 임대주택 섹션 전용 설정 */
export interface HousingConfig {
  /** 비어 있으면 등록된 모든 소스 */
  enabledSources: SourceId[];
  /** 자동 수집 간격(분). 0 이면 끈다. */
  syncIntervalMinutes: number;
}

export function parseSourceList(value: string | undefined): SourceId[] {
  if (!value) return [];
  const names = value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const unknown = names.filter((n) => !(SOURCE_IDS as readonly string[]).includes(n));
  if (unknown.length > 0) {
    throw new Error(`알 수 없는 소스: ${unknown.join(", ")} (사용 가능: ${SOURCE_IDS.join(", ")})`);
  }
  return names as SourceId[];
}

export function loadHousingConfig(env: Record<string, string | undefined> = process.env): HousingConfig {
  const parsed = schema.parse(env);
  const interval = parsed.HOUSING_SYNC_INTERVAL_MINUTES;
  if (interval > 0 && interval < MIN_SYNC_INTERVAL_MINUTES) {
    throw new Error(`HOUSING_SYNC_INTERVAL_MINUTES 는 0(끔) 또는 ${MIN_SYNC_INTERVAL_MINUTES} 이상이어야 합니다.`);
  }
  return { enabledSources: parseSourceList(parsed.HOUSING_SYNC_SOURCES), syncIntervalMinutes: interval };
}
