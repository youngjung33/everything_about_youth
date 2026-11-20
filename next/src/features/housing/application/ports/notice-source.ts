import type { SourceId } from "@/features/housing/domain/enums";
import type { NoticeDraft } from "@/features/housing/domain/notice";

/** 소스 호출 컨텍스트 */
export interface SourceContext {
  /** 수집 시각 (ISO) */
  fetchedAt: string; // 수집 시각 (ISO)
  signal?: AbortSignal; // signal
}

/** 소스 가용성 */
export interface SourceAvailability {
  available: boolean; // 소스 사용 가능 여부
  /** 사용 불가 사유 (예: 서비스키 미설정) */
  reason?: string; // 사용 불가 사유 (예: 서비스키 미설정)
}

/** 수집 중 소스가 스스로 "이번엔 건너뛴다"고 알릴 때 던진다 (예: robots.txt 가 접근을 금지). 실패가 아니라 skipped 로 기록된다. */
export class SourceSkippedError extends Error {
  constructor(reason: string) {
    super(reason); // super
    this.name = "SourceSkippedError";
  }
}

/** 모든 데이터 소스(OpenAPI, 크롤러)가 구현하는 공통 포트 */
export interface NoticeSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability; // 소스 가용성 확인
  fetchNotices(ctx: SourceContext): Promise<NoticeDraft[]>; // 공고 목록 가져오기
}
