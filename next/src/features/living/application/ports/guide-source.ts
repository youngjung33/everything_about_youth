import type { SourceId } from "@/features/living/domain/enums";
import type { LivingGuideDraft } from "@/features/living/domain/guide";

export interface SourceContext {
  fetchedAt: string;
  signal?: AbortSignal;
}

export interface SourceAvailability {
  available: boolean;
  reason?: string;
}

/** 수집 중 소스가 스스로 "이번엔 건너뛴다"고 알릴 때 던진다 (예: robots.txt 가 접근을 금지). 실패가 아니라 skipped 로 기록된다. */
export class SourceSkippedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SourceSkippedError";
  }
}

export interface GuideSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability;
  fetchGuides(ctx: SourceContext): Promise<LivingGuideDraft[]>;
}
