import { ApiError } from "@/common/presentation/api/errors";
import {
  DEFAULT_ADMIN_ACCOUNT_LIST_SORT,
  tryParseAdminAccountListSort,
  type AdminAccountListSort,
  type AdminAccountSortField,
  type AdminSortOrder,
  ADMIN_ACCOUNT_SORT_FIELDS,
} from "../domain/admin-account-list-sort";

export {
  ADMIN_ACCOUNT_SORT_FIELDS,
  DEFAULT_ADMIN_ACCOUNT_LIST_SORT,
  type AdminAccountListSort,
  type AdminAccountSortField,
  type AdminSortOrder,
};

/** API 라우트용 — 잘못된 sort·order 는 BAD_REQUEST */
export function parseAdminAccountListSort(sortRaw: string | null, orderRaw: string | null): AdminAccountListSort {
  const parsed = tryParseAdminAccountListSort(sortRaw, orderRaw);
  if (!parsed) throw new ApiError("BAD_REQUEST");
  return parsed;
}