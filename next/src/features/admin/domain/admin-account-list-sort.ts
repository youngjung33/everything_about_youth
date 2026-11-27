/** GET /admin/accounts 정렬 컬럼 */
export const ADMIN_ACCOUNT_SORT_FIELDS = ["loginId", "role", "disabled", "createdAt", "isRoot", "createdBy"] as const;

/** 계정 목록 sort 파라미터 필드 */
export type AdminAccountSortField = (typeof ADMIN_ACCOUNT_SORT_FIELDS)[number];

/** 오름·내림 */
export type AdminSortOrder = "asc" | "desc";

/** 계정 목록 정렬 */
export interface AdminAccountListSort {
  field: AdminAccountSortField; // 컬럼
  order: AdminSortOrder; // 방향
}

export const DEFAULT_ADMIN_ACCOUNT_LIST_SORT: AdminAccountListSort = {
  field: "loginId",
  order: "asc",
};

function isSortField(v: string): v is AdminAccountSortField {
  return (ADMIN_ACCOUNT_SORT_FIELDS as readonly string[]).includes(v);
}

/** 쿼리 파싱. 실패 시 null(잘못된 sort·order). */
export function tryParseAdminAccountListSort(
  sortRaw: string | null,
  orderRaw: string | null,
): AdminAccountListSort | null {
  if (!sortRaw && !orderRaw) return DEFAULT_ADMIN_ACCOUNT_LIST_SORT;
  const field = sortRaw ?? DEFAULT_ADMIN_ACCOUNT_LIST_SORT.field;
  const order = orderRaw ?? DEFAULT_ADMIN_ACCOUNT_LIST_SORT.order;
  if (!isSortField(field) || (order !== "asc" && order !== "desc")) return null;
  return { field, order };
}