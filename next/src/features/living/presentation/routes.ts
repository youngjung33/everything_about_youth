import { apiPath } from "@/common/presentation/api/version";

export const LIVING_BASE = "/living";
export const LIVING_SYNC_ADMIN_PATH = `${LIVING_BASE}/admin/sync`;
export const LIVING_SYNC_API_PATH = apiPath("/living/sync");

export const guidePath = (id: string) => `${LIVING_BASE}/guides/${id}`;

export const isLivingPath = (pathname: string) =>
  pathname === LIVING_BASE || pathname.startsWith(`${LIVING_BASE}/guides/`);
