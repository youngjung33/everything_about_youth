import { ADMIN_ACCOUNTS_PATH, ADMIN_BASE, ADMIN_PASSWORD_PATH } from "./routes";
import { HOUSING_SYNC_ADMIN_PATH } from "@/features/housing/presentation/routes";
import { BENEFITS_SYNC_ADMIN_PATH } from "@/features/benefits/presentation/routes";
import { FINANCE_SYNC_ADMIN_PATH } from "@/features/finance/presentation/routes";
import { JOBS_SYNC_ADMIN_PATH } from "@/features/jobs/presentation/routes";
import { LIVING_SYNC_ADMIN_PATH } from "@/features/living/presentation/routes";
import type { AdminPermissions } from "../domain/permissions";
import {
  canOpenAccountsPage,
  canOpenDashboard,
  canOpenPasswordSelf,
  canOpenSyncPage,
} from "../domain/permissions";
import type { AdminSyncSection } from "../domain/permissions";

/** 사이드바 한 메뉴 항목 */
export interface AdminSidebarItem {
  href: string; // 링크
  label: string; // 표시 이름
  match?: "exact" | "prefix"; // 활성 경로 규칙
}

/** 사이드바 섹션(그룹) */
export interface AdminSidebarSection {
  title: string; // 섹션 제목
  items: AdminSidebarItem[]; // 링크 목록
}

const SYNC_NAV: { section: AdminSyncSection; href: string; label: string }[] = [
  { section: "housing", href: HOUSING_SYNC_ADMIN_PATH, label: "임대주택" },
  { section: "benefits", href: BENEFITS_SYNC_ADMIN_PATH, label: "청년 혜택" },
  { section: "finance", href: FINANCE_SYNC_ADMIN_PATH, label: "주거·자금" },
  { section: "jobs", href: JOBS_SYNC_ADMIN_PATH, label: "일자리" },
  { section: "living", href: LIVING_SYNC_ADMIN_PATH, label: "이사·생활" },
];

/**
 * 권한에 따라 사이드바에 보일 섹션·링크를 만든다.
 * (일반 SaaS 어드민처럼 왼쪽 고정 네비, 워크플로 단위 그룹)
 */
export function buildAdminSidebarSections(permissions: AdminPermissions): AdminSidebarSection[] {
  const sections: AdminSidebarSection[] = [];

  if (canOpenDashboard(permissions)) {
    sections.push({
      title: "개요",
      items: [{ href: ADMIN_BASE, label: "대시보드", match: "exact" }],
    });
  }

  const syncItems = SYNC_NAV.filter((l) => canOpenSyncPage(permissions, l.section)).map((l) => ({
    href: l.href,
    label: l.label,
    match: "prefix" as const,
  }));
  if (syncItems.length > 0) {
    sections.push({ title: "데이터 수집", items: syncItems });
  }

  const systemItems: AdminSidebarItem[] = [];
  if (canOpenAccountsPage(permissions)) {
    systemItems.push({ href: ADMIN_ACCOUNTS_PATH, label: "관리자 계정", match: "prefix" });
  }
  if (canOpenPasswordSelf(permissions)) {
    systemItems.push({ href: ADMIN_PASSWORD_PATH, label: "비밀번호 변경", match: "exact" });
  }
  if (systemItems.length > 0) {
    sections.push({ title: "시스템", items: systemItems });
  }

  return sections;
}

/** 현재 경로가 이 메뉴와 일치하는지 */
export function isAdminSidebarLinkActive(pathname: string, item: AdminSidebarItem): boolean {
  const path = pathname.split("?")[0];
  if (item.match === "prefix") {
    return path === item.href || path.startsWith(`${item.href}/`);
  }
  if (item.href === ADMIN_BASE) {
    return path === ADMIN_BASE || path === `${ADMIN_BASE}/`;
  }
  return path === item.href;
}