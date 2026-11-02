import type { SchemeSourcePort, SourceAvailability, SourceContext } from "@/features/finance/application/ports/scheme-source";
import { curatedDrafts } from "./catalog";

export class CuratedSource implements SchemeSourcePort {
  readonly id = "curated" as const;
  readonly label = "큐레이션 catalog";

  checkAvailability(): SourceAvailability {
    return { available: true };
  }

  async fetchSchemes(ctx: SourceContext) {
    return curatedDrafts(ctx.fetchedAt);
  }
}
