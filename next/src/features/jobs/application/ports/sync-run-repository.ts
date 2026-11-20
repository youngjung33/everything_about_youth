import type { SourceId } from "@/features/jobs/domain/enums";

/** 수집 실행 상태 */
export type SyncRunStatus = "running" | "success" | "failed" | "skipped";

/** 수집 실행 이력 한 건 */
export interface SyncRun {
  id: number; // 식별자
  source: SourceId; // 데이터 소스
  status: SyncRunStatus; // 상태
  startedAt: string; // 시작 시각(ISO)
  finishedAt: string | null; // 종료 시각(ISO)
  fetchedCount: number; // 가져온 건수
  insertedCount: number; // 삽입 건수
  updatedCount: number; // 갱신 건수
  error: string | null; // 오류 메시지
}

/** 실행 종료 시 기록할 통계·오류 */
export interface SyncRunFinish {
  status: Exclude<SyncRunStatus, "running">; // 상태
  finishedAt: string; // 종료 시각(ISO)
  fetchedCount: number; // 가져온 건수
  insertedCount: number; // 삽입 건수
  updatedCount: number; // 갱신 건수
  error?: string; // 오류 메시지
}

/** 수집 실행 이력 저장소 포트 */
export interface SyncRunRepository {
  start(source: SourceId, startedAt: string): Promise<number>; // 수집 실행 시작
  finish(id: number, result: SyncRunFinish): Promise<void>; // 수집 실행 종료 기록
  listRecent(limit: number): Promise<SyncRun[]>; // 최근 실행 이력
  lastSuccessAt(): Promise<string | null>; // 마지막 성공 수집 시각
  latestPerSource(): Promise<SyncRun[]>; // 소스별 최신 실행
}
