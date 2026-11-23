import { canAdmin } from "../domain/role";
import { getVerifiedAdminSession } from "./admin-auth";

/** 수집 관리 화면에서 웹 수집 버튼 표시 여부 */
export async function adminWebSyncAllowed(): Promise<boolean> {
  const session = await getVerifiedAdminSession();
  return session !== null && canAdmin(session.role, "sync_trigger");
}