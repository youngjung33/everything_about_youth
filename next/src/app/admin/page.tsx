import Link from "next/link";
import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { HOUSING_SYNC_ADMIN_PATH } from "@/features/housing/presentation/routes";
import { BENEFITS_SYNC_ADMIN_PATH } from "@/features/benefits/presentation/routes";
import { FINANCE_SYNC_ADMIN_PATH } from "@/features/finance/presentation/routes";
import { JOBS_SYNC_ADMIN_PATH } from "@/features/jobs/presentation/routes";
import { LIVING_SYNC_ADMIN_PATH } from "@/features/living/presentation/routes";
import { ADMIN_ACCOUNTS_PATH } from "@/features/admin/presentation/routes";
import { getVerifiedAdminSession } from "@/features/admin/presentation/admin-auth";
import { canAdmin } from "@/features/admin/domain/role";

export const dynamic = "force-dynamic";

/** 관리자 홈 */
export default async function AdminHomePage() {
  const session = await getVerifiedAdminSession();
  return (
    <AdminPageShell>
      <div className="detail">
        <h1>관리자</h1>
        <p className="hint">섹션별 수집 현황·수동 수집·관리자 계정을 관리합니다.</p>
        <ul className="cards" style={{ listStyle: "none", padding: 0 }}>
          <li className="card">
            <Link href={HOUSING_SYNC_ADMIN_PATH}>임대주택 수집</Link>
          </li>
          <li className="card">
            <Link href={BENEFITS_SYNC_ADMIN_PATH}>청년 혜택 수집</Link>
          </li>
          <li className="card">
            <Link href={FINANCE_SYNC_ADMIN_PATH}>주거·자금 수집</Link>
          </li>
          <li className="card">
            <Link href={JOBS_SYNC_ADMIN_PATH}>일자리 수집</Link>
          </li>
          <li className="card">
            <Link href={LIVING_SYNC_ADMIN_PATH}>이사·생활 수집</Link>
          </li>
          {session && canAdmin(session.role, "account_list") && (
            <li className="card">
              <Link href={ADMIN_ACCOUNTS_PATH}>관리자 계정</Link>
            </li>
          )}
        </ul>
      </div>
    </AdminPageShell>
  );
}