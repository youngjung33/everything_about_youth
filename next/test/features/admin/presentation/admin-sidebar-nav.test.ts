import { describe, expect, it } from "vitest";
import { ADMIN_ACCOUNTS_PATH, ADMIN_BASE, ADMIN_PASSWORD_PATH } from "@/features/admin/presentation/routes";
import { ADMIN_SYNC_SECTIONS, permissionsForRole } from "@/features/admin/domain/permissions";
import {
  buildAdminSidebarSections,
  isAdminSidebarLinkActive,
} from "@/features/admin/presentation/admin-sidebar-nav";

describe("admin sidebar nav", () => {
  it("모든 페이지 접근이 none 이면 사이드바 메뉴가 없다", () => {
    const p = permissionsForRole("viewer");
    p.dashboard = "none";
    p.passwordSelf = "none";
    p.accounts.page = "none";
    for (const key of ADMIN_SYNC_SECTIONS) {
      p.sync[key].page = "none";
    }
    expect(buildAdminSidebarSections(p).flatMap((s) => s.items)).toHaveLength(0);
  });

  it("루트 등급이면 개요·수집·시스템 메뉴를 모두 노출한다", () => {
    const sections = buildAdminSidebarSections(permissionsForRole("super"));
    const labels = sections.flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toContain("대시보드");
    expect(labels).toContain("임대주택");
    expect(labels).toContain("관리자 계정");
  });

  it("대시보드 활성은 /admin 만", () => {
    const item = { href: ADMIN_BASE, label: "대시보드", match: "exact" as const };
    expect(isAdminSidebarLinkActive("/admin", item)).toBe(true);
    expect(isAdminSidebarLinkActive("/admin/accounts", item)).toBe(false);
  });

  it("계정 하위는 prefix 규칙", () => {
    const item = { href: ADMIN_ACCOUNTS_PATH, label: "계정", match: "prefix" as const };
    expect(isAdminSidebarLinkActive(ADMIN_ACCOUNTS_PATH, item)).toBe(true);
    expect(isAdminSidebarLinkActive(ADMIN_PASSWORD_PATH, item)).toBe(false);
  });
});