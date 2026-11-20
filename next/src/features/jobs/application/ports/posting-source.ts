import type { SourceId } from "@/features/jobs/domain/enums";
import type { JobPostingDraft } from "@/features/jobs/domain/job-posting";

/** 소스 호출 컨텍스트 */
export interface SourceContext {
  fetchedAt: string; // fetchedAt
  signal?: AbortSignal; // signal
}

/** 소스 가용성 */
export interface SourceAvailability {
  available: boolean; // 소스 사용 가능 여부
  reason?: string; // 실패 원인
}

/** 수집 중 소스가 스스로 "이번엔 건너뛴다"고 알릴 때 던진다 (예: robots.txt 가 접근을 금지). 실패가 아니라 skipped 로 기록된다. */
export class SourceSkippedError extends Error {
  constructor(reason: string) {
    super(reason); // super
    this.name = "SourceSkippedError";
  }
}

/** 채용 공고 소스 포트 */
export interface JobPostingSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability; // 소스 가용성 확인
  fetchPostings(ctx: SourceContext): Promise<JobPostingDraft[]>; // 채용 공고 목록 가져오기
}
