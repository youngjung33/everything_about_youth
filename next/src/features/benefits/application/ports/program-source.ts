import type { SourceId } from "@/features/benefits/domain/enums";
import type { BenefitProgramDraft } from "@/features/benefits/domain/program";

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

export interface ProgramSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability;
  fetchPrograms(ctx: SourceContext): Promise<BenefitProgramDraft[]>;
}
