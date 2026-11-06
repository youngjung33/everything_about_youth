import type { SourceId } from "@/features/living/domain/enums";

export type SyncRunStatus = "running" | "success" | "failed" | "skipped";

export interface SyncRun {
  id: number;
  source: SourceId;
  status: SyncRunStatus;
  startedAt: string;
  finishedAt: string | null;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  error: string | null;
}

export interface SyncRunFinish {
  status: Exclude<SyncRunStatus, "running">;
  finishedAt: string;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  error?: string;
}

export interface SyncRunRepository {
  start(source: SourceId, startedAt: string): Promise<number>;
  finish(id: number, result: SyncRunFinish): Promise<void>;
  listRecent(limit: number): Promise<SyncRun[]>;
  lastSuccessAt(): Promise<string | null>;
  latestPerSource(): Promise<SyncRun[]>;
}
