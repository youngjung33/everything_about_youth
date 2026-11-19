import type { SourceId } from "@/features/housing/domain/enums";

/** 수집 실행 상태 */
export type SyncRunStatus = "running" | "success" | "failed" | "skipped";

/** 수집 실행 이력 한 건 */
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

/** 실행 종료 시 기록할 통계·오류 */
export interface SyncRunFinish {
  status: Exclude<SyncRunStatus, "running">;
  finishedAt: string;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  error?: string | null;
}

/** 수집 실행 이력 저장소 포트 */
export interface SyncRunRepository {
  start(source: SourceId, startedAt: string): Promise<number>;
  finish(id: number, result: SyncRunFinish): Promise<void>;
  listRecent(limit: number): Promise<SyncRun[]>;
  /** 소스별 가장 최근 실행 */
  latestPerSource(): Promise<SyncRun[]>;
  /** 어느 소스든 마지막으로 성공한 수집이 끝난 시각(ISO). 한 번도 성공한 적이 없으면 null. 공고 데이터가 마지막으로 갱신된 시각으로 쓴다. */
  lastSuccessAt(): Promise<string | null>;
}
