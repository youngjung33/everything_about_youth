import type { SourceId } from "@/features/benefits/domain/enums";
import type { BenefitProgramDraft } from "@/features/benefits/domain/program";

/** 소스 fetch 컨텍스트 */
export interface SourceContext {
  /** 수집 시각 (ISO) */
  fetchedAt: string;
  signal?: AbortSignal;
}

/** 소스 사용 가능 여부 */
export interface SourceAvailability {
  available: boolean;
  /** 사용 불가 사유 */
  reason?: string;
}

/** 수집 스킵(robots 등). 실패가 아니라 skipped 로 기록 */
export class SourceSkippedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SourceSkippedError";
  }
}

/** 모든 정책 데이터 소스가 구현하는 포트 */
export interface ProgramSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability;
  fetchPrograms(ctx: SourceContext): Promise<BenefitProgramDraft[]>;
}
