import type { SourceId } from "@/features/finance/domain/enums";
import type { FinanceSchemeDraft } from "@/features/finance/domain/scheme";

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

export interface SchemeSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability;
  fetchSchemes(ctx: SourceContext): Promise<FinanceSchemeDraft[]>;
}
