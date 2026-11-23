import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { AdminPasswordForm } from "@/features/admin/presentation/components/AdminPasswordForm";

export const dynamic = "force-dynamic";

export default function AdminPasswordPage() {
  return (
    <AdminPageShell>
      <div className="detail" style={{ maxWidth: 420 }}>
        <h1>비밀번호 변경</h1>
        <AdminPasswordForm />
      </div>
    </AdminPageShell>
  );
}