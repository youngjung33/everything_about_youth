import type { JobPostingSourcePort, SourceAvailability, SourceContext } from "@/features/jobs/application/ports/posting-source";
import { curatedDrafts } from "./catalog";

export class CuratedSource implements JobPostingSourcePort {
  readonly id = "curated" as const;
  readonly label = "큐레이션 catalog";

  checkAvailability(): SourceAvailability {
    return { available: true };
  }

  async fetchPostings(ctx: SourceContext) {
    return curatedDrafts(ctx.fetchedAt);
  }
}
