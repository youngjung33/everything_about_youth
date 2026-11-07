import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { type SourceId } from "../domain/enums";
import { parseSourceList } from "../domain/sync-sources";

export const MIN_SYNC_INTERVAL_MINUTES = 30;

const schema = z.object({
  JOBS_SYNC_SOURCES: z.preprocess(emptyToUndefined, z.string().optional()),
  JOBS_SYNC_INTERVAL_MINUTES: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),
});

export interface JobsConfig {
  enabledSources: SourceId[];
  syncIntervalMinutes: number;
}

export function loadJobsConfig(env: Record<string, string | undefined> = process.env): JobsConfig {
  const parsed = schema.parse(env);
  const interval = parsed.JOBS_SYNC_INTERVAL_MINUTES;
  if (interval > 0 && interval < MIN_SYNC_INTERVAL_MINUTES) {
    throw new Error(`JOBS_SYNC_INTERVAL_MINUTES 는 0(끔) 또는 ${MIN_SYNC_INTERVAL_MINUTES} 이상이어야 합니다.`);
  }
  return {
    enabledSources: parseSourceList(parsed.JOBS_SYNC_SOURCES),
    syncIntervalMinutes: interval,
  };
}
