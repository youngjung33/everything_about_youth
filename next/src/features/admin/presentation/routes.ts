import { apiPath } from "@/common/presentation/api/version";

/** 관리자 로그인·대시보드 */
export const ADMIN_BASE = "/admin";
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE}/login`;
export const ADMIN_ACCOUNTS_PATH = `${ADMIN_BASE}/accounts`;
export const ADMIN_PASSWORD_PATH = `${ADMIN_BASE}/password`;

/** 관리자 JSON API */
export const ADMIN_API_LOGIN = apiPath("/admin/login");
export const ADMIN_API_LOGOUT = apiPath("/admin/logout");
export const ADMIN_API_ME = apiPath("/admin/me");
export const ADMIN_API_PASSWORD = apiPath("/admin/password");
export const ADMIN_API_ACCOUNTS = apiPath("/admin/accounts");

/** 이 경로는 로그인 없이 접근 가능 */
export const ADMIN_PUBLIC_PATHS = [ADMIN_LOGIN_PATH] as const;

/** 관리자 로그인 후 접근 가능한 페이지 prefix */
export const ADMIN_PAGE_PREFIXES = [
  ADMIN_BASE,
  "/housing/admin",
  "/benefits/admin",
  "/finance/admin",
  "/jobs/admin",
  "/living/admin",
] as const;

export function isAdminPagePath(pathname: string): boolean {
  if (pathname === ADMIN_LOGIN_PATH) return false;
  return ADMIN_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}