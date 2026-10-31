import { apiPath } from "@/common/presentation/api/version";

export const BENEFITS_BASE = "/benefits";
export const BENEFITS_SYNC_ADMIN_PATH = `${BENEFITS_BASE}/admin/sync`;
export const BENEFITS_SYNC_API_PATH = apiPath("/benefits/sync");

export const programPath = (id: string) => `${BENEFITS_BASE}/programs/${id}`;

export const isBenefitsPath = (pathname: string) =>
  pathname === BENEFITS_BASE || pathname.startsWith(`${BENEFITS_BASE}/programs/`);
