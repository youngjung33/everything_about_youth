import Link from "next/link";
import { AdminPageShell } from "@/features/admin/presentation/components/AdminPageShell";
import { HOUSING_SYNC_ADMIN_PATH } from "@/features/housing/presentation/routes";
import { BENEFITS_SYNC_ADMIN_PATH } from "@/features/benefits/presentation/routes";
import { FINANCE_SYNC_ADMIN_PATH } from "@/features/finance/presentation/routes";
import { JOBS_SYNC_ADMIN_PATH } from "@/features/jobs/presentation/routes";
import { LIVING_SYNC_ADMIN_PATH } from "@/features/living/presentation/routes";
import { ADMIN_ACCOUNTS_PATH } from "@/features/admin/presentation/routes";
import { guardDashboard, requireAdminSession } from "@/features/admin/presentation/admin-page-access";
import { canOpenAccountsPage, canOpenSyncPage } from "@/features/admin/domain/permissions";

export const dynamic = "force-dynamic";

const LINKS = [
  { section: "housing" as const, href: HOUSING_SYNC_ADMIN_PATH, label: "임대주택 수집" },
  { section: "benefits" as const, href: BENEFITS_SYNC_ADMIN_PATH, label: "청년 혜택 수집" },
  { section: "finance" as const, href: FINANCE_SYNC_ADMIN_PATH, label: "주거·자금 수집" },
  { section: "jobs" as const, href: JOBS_SYNC_ADMIN_PATH, label: "일자리 수집" },
  { section: "living" as const, href: LIVING_SYNC_ADMIN_PATH, label: "이사·생활 수집" },
];

/** 관리자 홈 */
export default async function AdminHomePage() {
  const session = await requireAdminSession();
  guardDashboard(session);
  const { permissions } = session;
  return (
    <AdminPageShell session={session}>
      <div className="detail">
        <h1>관리자</h1>
        <p className="hint">권한에 따라 보이는 메뉴·기능만 사용할 수 있습니다.</p>
        <ul className="cards" style={{ listStyle: "none", padding: 0 }}>
          {LINKS.filter((l) => canOpenSyncPage(permissions, l.section)).map((l) => (
            <li key={l.section} className="card">
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
          {canOpenAccountsPage(permissions) && (
            <li className="card">
              <Link href={ADMIN_ACCOUNTS_PATH}>관리자 계정</Link>
            </li>
          )}
        </ul>
      </div>
    </AdminPageShell>
  );
}