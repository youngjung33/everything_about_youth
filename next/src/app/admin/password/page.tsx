import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { AdminPasswordForm } from "@/features/admin/presentation/components/AdminPasswordForm";
import { guardPasswordSelf, requireAdminSession } from "@/features/admin/presentation/admin-page-access";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage() {
  const session = await requireAdminSession();
  guardPasswordSelf(session);
  const readOnly = session.permissions.passwordSelf !== "edit";
  return (
    <AdminPageShell session={session}>
      <div className="detail" style={{ maxWidth: 420 }}>
        <h1>비밀번호 변경</h1>
        {readOnly ? <p className="hint">비밀번호 변경 권한이 없습니다(보기만 가능).</p> : <AdminPasswordForm />}
      </div>
    </AdminPageShell>
  );
}