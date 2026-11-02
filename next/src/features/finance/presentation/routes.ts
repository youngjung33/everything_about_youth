import { apiPath } from "@/common/presentation/api/version";

export const FINANCE_BASE = "/finance";
export const FINANCE_SYNC_ADMIN_PATH = `${FINANCE_BASE}/admin/sync`;
export const FINANCE_SYNC_API_PATH = apiPath("/finance/sync");

export const programPath = (id: string) => `${FINANCE_BASE}/programs/${id}`;

export const isFinancePath = (pathname: string) =>
  pathname === FINANCE_BASE || pathname.startsWith(`${FINANCE_BASE}/programs/`);
