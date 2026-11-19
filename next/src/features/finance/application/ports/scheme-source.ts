import type { SourceId } from "@/features/finance/domain/enums";
import type { FinanceSchemeDraft } from "@/features/finance/domain/scheme";

export interface SourceContext {
  /** 수집 시각 (ISO) */
  fetchedAt: string;
  signal?: AbortSignal;
}

export interface SourceAvailability {
  available: boolean;
  /** 사용 불가 사유 (예: API 키 미설정) */
  reason?: string;
}

/** 수집 중 소스가 스스로 "이번엔 건너뛴다"고 알릴 때 던진다. 실패가 아니라 skipped 로 기록된다. */
export class SourceSkippedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SourceSkippedError";
  }
}

/** 모든 데이터 소스(온통·큐레이션 등)가 구현하는 공통 포트 */
export interface SchemeSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability;
  fetchSchemes(ctx: SourceContext): Promise<FinanceSchemeDraft[]>;
}