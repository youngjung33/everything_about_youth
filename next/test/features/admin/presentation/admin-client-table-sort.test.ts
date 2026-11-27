import { describe, expect, it } from "vitest";

/** 훅과 동일한 비교·정렬 로직을 단위 검증 */
function sortRows<T, K extends string>(
  rows: T[],
  key: K,
  order: "asc" | "desc",
  compare: (row: T, key: K) => string | number | boolean,
): T[] {
  const sign = order === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = compare(a, key);
    const bv = compare(b, key);
    if (typeof av === "boolean" && typeof bv === "boolean") {
      if (av === bv) return 0;
      return ((av ? 1 : 0) - (bv ? 1 : 0)) * sign;
    }
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "ko") * sign;
    if (av === bv) return 0;
    return (av < bv ? -1 : 1) * sign;
  });
}

describe("admin client table sort", () => {
  it("숫자 id 내림차순", () => {
    const rows = [{ id: 1 }, { id: 3 }, { id: 2 }];
    const sorted = sortRows(rows, "id", "desc", (r) => r.id);
    expect(sorted.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("boolean 사용 가능 내림차순이면 true 가 앞", () => {
    const rows = [{ ok: false }, { ok: true }];
    const sorted = sortRows(rows, "ok", "desc", (r, k) => r[k]);
    expect(sorted[0]?.ok).toBe(true);
  });
});