import { apiPath } from "@/common/presentation/api/version";

/** 생활정보 섹션의 URL 경로. 섹션을 다른 경로로 옮기려면 여기만 바꾸면 된다. */
export const LIVING_BASE = "/living";
/** 수동 동기화 관리 화면 */
export const LIVING_SYNC_ADMIN_PATH = `${LIVING_BASE}/admin/sync`;
/** 동기화 트리거 API */
export const LIVING_SYNC_API_PATH = apiPath("/living/sync");

/** 생활·행정 안내 상세 경로 */
export const guidePath = (id: string) => `${LIVING_BASE}/guides/${id}`;

/** 생활정보 화면(목록·상세)인지 — 내 조건 복원 대상 판단용 */
export const isLivingPath = (pathname: string) =>
  pathname === LIVING_BASE || pathname.startsWith(`${LIVING_BASE}/guides/`);
