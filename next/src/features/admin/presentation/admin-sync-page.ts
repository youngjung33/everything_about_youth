import type { AdminSyncSection } from "../domain/permissions";
import { syncPageFlags } from "./admin-page-access";
import { getVerifiedAdminSession } from "./admin-auth";

/** 수집 관리 화면에서 표시·버튼 플래그 */
export async function adminSyncPageAccess(section: AdminSyncSection): Promise<{
  canViewSources: boolean;
  canViewRuns: boolean;
  canTrigger: boolean;
}> {
  const session = await getVerifiedAdminSession();
  if (!session) return { canViewSources: false, canViewRuns: false, canTrigger: false };
  return syncPageFlags(session.permissions, section);
}