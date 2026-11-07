import type { SourceId } from "@/features/jobs/domain/enums";
import type { JobPostingDraft } from "@/features/jobs/domain/job-posting";

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

export interface JobPostingSourcePort {
  readonly id: SourceId;
  readonly label: string;
  checkAvailability(): SourceAvailability;
  fetchPostings(ctx: SourceContext): Promise<JobPostingDraft[]>;
}
