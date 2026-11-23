import Link from "next/link";
import { ADMIN_ACCOUNTS_PATH, ADMIN_BASE, ADMIN_PASSWORD_PATH } from "../routes";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { ADMIN_ROLE_LABELS, canAdmin, type AdminRole } from "../../domain/role";
import { HOUSING_SYNC_ADMIN_PATH } from "@/features/housing/presentation/routes";
import { BENEFITS_SYNC_ADMIN_PATH } from "@/features/benefits/presentation/routes";
import { FINANCE_SYNC_ADMIN_PATH } from "@/features/finance/presentation/routes";
import { JOBS_SYNC_ADMIN_PATH } from "@/features/jobs/presentation/routes";
import { LIVING_SYNC_ADMIN_PATH } from "@/features/living/presentation/routes";

/** 관리자 공통 상단 네비 */
export function AdminNav(props: { loginId: string; role: AdminRole }) {
  return (
    <nav className="section-nav" aria-label="관리자 메뉴">
      <Link href={ADMIN_BASE}>관리 홈</Link>
      <Link href={HOUSING_SYNC_ADMIN_PATH}>임대주택 수집</Link>
      <Link href={BENEFITS_SYNC_ADMIN_PATH}>혜택 수집</Link>
      <Link href={FINANCE_SYNC_ADMIN_PATH}>자금 수집</Link>
      <Link href={JOBS_SYNC_ADMIN_PATH}>일자리 수집</Link>
      <Link href={LIVING_SYNC_ADMIN_PATH}>생활 수집</Link>
      {canAdmin(props.role, "account_list") && <Link href={ADMIN_ACCOUNTS_PATH}>계정</Link>}
      <Link href={ADMIN_PASSWORD_PATH}>비밀번호</Link>
      <span className="hint" style={{ marginLeft: "auto" }}>
        {props.loginId} · {ADMIN_ROLE_LABELS[props.role]}
      </span>
      <AdminLogoutButton />
    </nav>
  );
}