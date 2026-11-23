import { redirect } from "next/navigation";
import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { getVerifiedAdminSession } from "@/features/admin/presentation/admin-auth";
import { canAdmin } from "@/features/admin/domain/role";
import { ADMIN_LOGIN_PATH } from "@/features/admin/presentation/routes";
import { AdminAccountsPanel } from "@/features/admin/presentation/components/AdminAccountsPanel";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const session = await getVerifiedAdminSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  if (!canAdmin(session.role, "account_list")) {
    return (
      <AdminPageShell>
        <p className="hint">계정 목록을 볼 권한이 없습니다.</p>
      </AdminPageShell>
    );
  }
  return (
    <AdminPageShell>
      <AdminAccountsPanel actorRole={session.role} />
    </AdminPageShell>
  );
}