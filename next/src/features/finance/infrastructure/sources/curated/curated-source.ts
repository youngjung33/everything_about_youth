import type { SchemeSourcePort, SourceAvailability, SourceContext } from "@/features/finance/application/ports/scheme-source";
import { curatedDrafts } from "./catalog";

/** 저장소에 박아 둔 시드·큐레이션 금융 상품 목록 소스 */
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
