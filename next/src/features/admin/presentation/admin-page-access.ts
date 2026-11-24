import { redirect } from "next/navigation";
import {
  type AdminPermissions,
  type AdminSyncSection,
  canOpenAccountsPage,
  canOpenDashboard,
  canOpenPasswordSelf,
  canOpenSyncPage,
  canTriggerSync,
  hasAnyAdminAccess,
  resolveAdminPermissions,
} from "../domain/permissions";
import type { AdminSessionView } from "../application/use-cases/verify-admin-session";
import { ADMIN_BASE, ADMIN_LOGIN_PATH } from "./routes";
import { getVerifiedAdminSession } from "./admin-auth";

/** 세션이 없거나 관리 영역 접근이 전혀 없으면 로그인으로 보낸다. */
export async function requireAdminSession(): Promise<AdminSessionView> {
  const session = await getVerifiedAdminSession();
  if (!session || !hasAnyAdminAccess(session.permissions)) redirect(ADMIN_LOGIN_PATH);
  return session;
}

export function guardDashboard(session: AdminSessionView): void {
  if (!canOpenDashboard(session.permissions)) redirect(ADMIN_BASE);
}

export function guardAccountsPage(session: AdminSessionView): void {
  if (!canOpenAccountsPage(session.permissions)) redirect(ADMIN_BASE);
}

export function guardPasswordSelf(session: AdminSessionView): void {
  if (!canOpenPasswordSelf(session.permissions)) redirect(ADMIN_BASE);
}

export function guardSyncPage(session: AdminSessionView, section: AdminSyncSection): void {
  if (!canOpenSyncPage(session.permissions, section)) redirect(ADMIN_BASE);
}

/** 수집 화면용 플래그 */
export function syncPageFlags(perms: AdminPermissions, section: AdminSyncSection): {
  canViewSources: boolean;
  canViewRuns: boolean;
  canTrigger: boolean;
} {
  const s = perms.sync[section];
  if (s.page === "none") {
    return { canViewSources: false, canViewRuns: false, canTrigger: false };
  }
  return {
    canViewSources: s.viewSources,
    canViewRuns: s.viewRuns,
    canTrigger: canTriggerSync(perms, section),
  };
}

/** API 목록 응답용 */
export function effectivePermissionsForAccount(
  role: AdminSessionView["role"],
  override: import("../domain/permissions").AdminPermissionsOverride | null,
  isRoot: boolean,
): AdminPermissions {
  return resolveAdminPermissions(role, override, isRoot);
}