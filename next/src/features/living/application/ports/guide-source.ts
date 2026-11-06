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
