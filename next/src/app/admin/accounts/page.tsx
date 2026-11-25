import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { guardAccountsPage, requireAdminSession } from "@/features/admin/presentation/admin-page-access";
import { AdminAccountsPanel } from "@/features/admin/presentation/components/AdminAccountsPanel";
import { adminDevDiagnosticsEnabled } from "@/features/admin/presentation/admin-dev-diagnostics";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const session = await requireAdminSession();
  guardAccountsPage(session);
  return (
    <AdminPageShell session={session}>
      <AdminAccountsPanel
        actorRole={session.role}
        actorPermissions={session.permissions}
        devDiagnostics={adminDevDiagnosticsEnabled(session)}
      />
    </AdminPageShell>
  );
}