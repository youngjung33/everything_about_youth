import { useMemo, useState } from "react";
import {
  cycleAdminTableTriSort,
  type AdminTableTriSortState,
} from "./admin-table-sort-cycle";

/** 테이블 클라이언트 정렬 상태 */
export type AdminClientTableSortState<K extends string> = AdminTableTriSortState<K>;

/** 컬럼별 비교 */
export type AdminClientSortCompare<T, K extends string> = (
  row: T,
  key: K,
) => string | number | boolean;

/**
 * SSR 로 받은 행을 관리자 테이블에서 정렬할 때 쓰는 훅.
 * (데이터가 이미 전부 있을 때만 — 페이지네이션 없음)
 */
export function useAdminClientTableSort<T, K extends string>(props: {
  rows: T[];
  defaultKey: K;
  /** defaultKey 의 첫 정렬 방향 */
  defaultOrder?: "asc" | "desc";
  /** 컬럼별 첫 클릭 시 기본 방향 */
  defaultOrderForKey?: Partial<Record<K, "asc" | "desc">>;
  compare: AdminClientSortCompare<T, K>;
}): {
  sort: AdminClientTableSortState<K>;
  setSortKey: (key: string) => void;
  sorted: T[];
} {
  const { rows, compare, defaultOrder, defaultOrderForKey: orderForKey } = props;

  const firstOrderForKey = (col: K): "asc" | "desc" => orderForKey?.[col] ?? defaultOrder ?? "asc";

  const [sort, setSort] = useState<AdminClientTableSortState<K>>({ active: false });

  const setSortKey = (key: string) => {
    const col = key as K;
    setSort((prev) => cycleAdminTableTriSort(prev, col, firstOrderForKey));
  };

  const sorted = useMemo(() => {
    if (!sort.active) return rows;
    const sign = sort.order === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = compare(a, sort.key);
      const bv = compare(b, sort.key);
      if (typeof av === "boolean" && typeof bv === "boolean") {
        if (av === bv) return 0;
        return ((av ? 1 : 0) - (bv ? 1 : 0)) * sign;
      }
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "ko") * sign;
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * sign;
    });
  }, [rows, compare, sort]);

  return { sort, setSortKey, sorted };
}