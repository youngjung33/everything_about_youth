import type { GuideSourcePort, SourceAvailability, SourceContext } from "@/features/living/application/ports/guide-source";
import { curatedDrafts } from "./catalog";

export class CuratedSource implements GuideSourcePort {
  readonly id = "curated" as const;
  readonly label = "큐레이션 catalog";

  checkAvailability(): SourceAvailability {
    return { available: true };
  }

  async fetchGuides(ctx: SourceContext) {
    return curatedDrafts(ctx.fetchedAt);
  }
}
