import type { SourceId } from "@/features/housing/domain/enums";
import type { NoticeDraft } from "@/features/housing/domain/notice";

export interface SourceContext {
  /** 수집 시각 (ISO) */
  fetchedAt: string;
  signal?: AbortSignal;
}

export interface SourceAvailability {
  available: boolean;
  /** 사용 불가 사유 (예: 서비스키 미설정) */
  reason?: string;
}

/** 수집 중 소스가 스스로 "이번엔 건너뛴다"고 알릴 때 던진다 (예: robots.txt 가 접근을 금지). 실패가 아니라 skipped 로 기록된다. */
export class SourceSkippedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SourceSkippedError";
  }
}

/** 모든 데이터 소스(OpenAPI, 크롤러)가 구현하는 공통 포트 */
export interface NoticeSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability;
  fetchNotices(ctx: SourceContext): Promise<NoticeDraft[]>;
}
