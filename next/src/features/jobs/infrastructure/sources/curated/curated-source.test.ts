import { describe, expect, it } from "vitest";
import { CURATED_CATALOG } from "./catalog";
import { CuratedSource } from "./curated-source";

describe("CuratedSource", () => {
  it("catalog slug 가 중복되지 않는다", () => {
    const slugs = CURATED_CATALOG.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("checkAvailability 는 항상 사용 가능", () => {
    const source = new CuratedSource();
    expect(source.checkAvailability()).toEqual({ available: true });
  });

  it("fetchPostings 는 catalog 건수와 동일한 draft 를 반환", async () => {
    const fetchedAt = "2026-01-01T00:00:00.000Z";
    const drafts = await new CuratedSource().fetchPostings({ fetchedAt, signal: new AbortController().signal });
    expect(drafts).toHaveLength(CURATED_CATALOG.length);
    expect(drafts.every((d) => d.sources[0]?.source === "curated")).toBe(true);
    expect(drafts.every((d) => d.sources[0]?.fetchedAt === fetchedAt)).toBe(true);
  });
});
