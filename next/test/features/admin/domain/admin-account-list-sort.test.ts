import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_ACCOUNT_LIST_SORT,
  tryParseAdminAccountListSort,
} from "@/features/admin/domain/admin-account-list-sort";

describe("admin account list sort", () => {
  it("빈 쿼리면 loginId asc 기본", () => {
    expect(tryParseAdminAccountListSort(null, null)).toEqual(DEFAULT_ADMIN_ACCOUNT_LIST_SORT);
  });

  it("알 수 없는 sort 필드면 null", () => {
    expect(tryParseAdminAccountListSort("email", "asc")).toBeNull();
  });

  it("order 가 asc|desc 가 아니면 null", () => {
    expect(tryParseAdminAccountListSort("loginId", "up")).toBeNull();
  });

  it("createdAt desc 를 파싱한다", () => {
    expect(tryParseAdminAccountListSort("createdAt", "desc")).toEqual({ field: "createdAt", order: "desc" });
  });

  it("createdBy asc 를 파싱한다", () => {
    expect(tryParseAdminAccountListSort("createdBy", "asc")).toEqual({ field: "createdBy", order: "asc" });
  });
});