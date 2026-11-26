import { useMemo, useState } from "react";

/** 테이블 클라이언트 정렬 상태 */
export interface AdminClientTableSortState<K extends string> {
  key: K; // 컬럼
  order: "asc" | "desc"; // 방향
}

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
  compare: AdminClientSortCompare<T, K>;
}): {
  sort: AdminClientTableSortState<K>;
  setSortKey: (key: K) => void;
  sorted: T[];
} {
  const [sort, setSort] = useState<AdminClientTableSortState<K>>({
    key: props.defaultKey,
    order: "desc",
  });

  const setSortKey = (key: K) => {
    setSort((prev) =>
      prev.key === key ? { key, order: prev.order === "asc" ? "desc" : "asc" } : { key, order: "asc" },
    );
  };

  const sorted = useMemo(() => {
    const sign = sort.order === "asc" ? 1 : -1;
    return [...props.rows].sort((a, b) => {
      const av = props.compare(a, sort.key);
      const bv = props.compare(b, sort.key);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv, "ko") * sign;
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * sign;
    });
  }, [props.rows, props.compare, sort.key, sort.order]);

  return { sort, setSortKey, sorted };
}