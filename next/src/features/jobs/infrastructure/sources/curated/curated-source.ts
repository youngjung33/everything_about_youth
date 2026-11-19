import type { JobPostingSourcePort, SourceAvailability, SourceContext } from "@/features/jobs/application/ports/posting-source";
import { curatedDrafts } from "./catalog";

/** 저장소에 박아 둔 시드·큐레이션 채용 공고 목록 소스 */
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
