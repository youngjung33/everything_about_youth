/** 헤더 클릭 정렬: 비활성(↕) → 1차 방향 → 반대 → 비활성 */
export type AdminTableTriSortState<K extends string> =
  | { active: false }
  | { active: true; key: K; order: "asc" | "desc" };

/** 컬럼별 첫 정렬 방향 */
export type AdminTableFirstSortOrder<K extends string> = (key: K) => "asc" | "desc";

/**
 * 같은 컬럼 연속 클릭 시 3단 사이클. 다른 컬럼이면 해당 컬럼 1차 방향부터.
 */
export function cycleAdminTableTriSort<K extends string>(
  prev: AdminTableTriSortState<K>,
  key: K,
  firstOrderForKey: AdminTableFirstSortOrder<K>,
): AdminTableTriSortState<K> {
  const first = firstOrderForKey(key);
  const second: "asc" | "desc" = first === "asc" ? "desc" : "asc";

  if (!prev.active || prev.key !== key) {
    return { active: true, key, order: first };
  }
  if (prev.order === first) {
    return { active: true, key, order: second };
  }
  return { active: false };
}