import { apiPath } from "@/common/presentation/api/version";

/** 임대주택 섹션의 URL 경로. 섹션을 다른 경로로 옮기려면 여기만 바꾸면 된다. */
export const HOUSING_BASE = "/housing";
export const HOUSING_SYNC_ADMIN_PATH = `${HOUSING_BASE}/admin/sync`;
export const HOUSING_SYNC_API_PATH = apiPath("/housing/sync");

export const noticePath = (id: string) => `${HOUSING_BASE}/notices/${id}`;

/** 임대주택 화면(목록·상세)인지 — 내 조건 복원 대상 판단용 */
export const isHousingPath = (pathname: string) =>
  pathname === HOUSING_BASE || pathname.startsWith(`${HOUSING_BASE}/notices/`);
