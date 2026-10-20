import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { SOURCE_IDS, type SourceId } from "../domain/enums";

const schema = z.object({
  HOUSING_SYNC_SOURCES: z.preprocess(emptyToUndefined, z.string().optional()),
});

/** 임대주택 섹션 전용 설정 */
export interface HousingConfig {
  /** 비어 있으면 등록된 모든 소스 */
  enabledSources: SourceId[];
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
  return { enabledSources: parseSourceList(parsed.HOUSING_SYNC_SOURCES) };
}
