import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { type SourceId } from "../domain/enums";
import { parseSourceList } from "../domain/sync-sources";

export const MIN_SYNC_INTERVAL_MINUTES = 30;

const schema = z.object({
  FINANCE_SYNC_SOURCES: z.preprocess(emptyToUndefined, z.string().optional()),
  FINANCE_SYNC_INTERVAL_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),
  BENEFITS_ONTONG_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
});

export interface FinanceConfig {
  enabledSources: SourceId[];
  syncIntervalMinutes: number;
  ontongApiKey?: string;
}

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
