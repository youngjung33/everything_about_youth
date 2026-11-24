import Link from "next/link";
import { ADMIN_ACCOUNTS_PATH, ADMIN_BASE, ADMIN_PASSWORD_PATH } from "../routes";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { ADMIN_ROLE_LABELS } from "../../domain/role";
import type { AdminSessionView } from "../../application/use-cases/verify-admin-session";
import {
  canOpenAccountsPage,
  canOpenDashboard,
  canOpenPasswordSelf,
  canOpenSyncPage,
} from "../../domain/permissions";
import { HOUSING_SYNC_ADMIN_PATH } from "@/features/housing/presentation/routes";
import { BENEFITS_SYNC_ADMIN_PATH } from "@/features/benefits/presentation/routes";
import { FINANCE_SYNC_ADMIN_PATH } from "@/features/finance/presentation/routes";
import { JOBS_SYNC_ADMIN_PATH } from "@/features/jobs/presentation/routes";
import { LIVING_SYNC_ADMIN_PATH } from "@/features/living/presentation/routes";

const SYNC_LINKS = [
  { section: "housing" as const, href: HOUSING_SYNC_ADMIN_PATH, label: "임대주택 수집" },
  { section: "benefits" as const, href: BENEFITS_SYNC_ADMIN_PATH, label: "혜택 수집" },
  { section: "finance" as const, href: FINANCE_SYNC_ADMIN_PATH, label: "자금 수집" },
  { section: "jobs" as const, href: JOBS_SYNC_ADMIN_PATH, label: "일자리 수집" },
  { section: "living" as const, href: LIVING_SYNC_ADMIN_PATH, label: "생활 수집" },
];

/** 관리자 공통 상단 네비 */
export function AdminNav(props: { session: AdminSessionView }) {
  const { permissions, loginId, role, isRoot } = props.session;
  return (
    <nav className="section-nav" aria-label="관리자 메뉴">
      {canOpenDashboard(permissions) && <Link href={ADMIN_BASE}>관리 홈</Link>}
      {SYNC_LINKS.filter((l) => canOpenSyncPage(permissions, l.section)).map((l) => (
        <Link key={l.section} href={l.href}>
          {l.label}
        </Link>
      ))}
      {canOpenAccountsPage(permissions) && <Link href={ADMIN_ACCOUNTS_PATH}>계정</Link>}
      {canOpenPasswordSelf(permissions) && <Link href={ADMIN_PASSWORD_PATH}>비밀번호</Link>}
      <span className="hint" style={{ marginLeft: "auto" }}>
        {loginId}
        {isRoot ? " · 루트" : ""} · {ADMIN_ROLE_LABELS[role]}
      </span>
      <AdminLogoutButton />
    </nav>
  );
}