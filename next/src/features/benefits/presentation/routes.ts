import { apiPath } from "@/common/presentation/api/version";

/** 청년 혜택 섹션 URL 경로 */
export const BENEFITS_BASE = "/benefits";
/** 수동 동기화 관리 화면 */
export const BENEFITS_SYNC_ADMIN_PATH = `${BENEFITS_BASE}/admin/sync`;
/** 동기화 트리거 API */
export const BENEFITS_SYNC_API_PATH = apiPath("/benefits/sync");

/** 정책 상세 경로 */
export const programPath = (id: string) => `${BENEFITS_BASE}/programs/${id}`;

/** 청년 혜택 화면인지 — 내 조건 복원 대상 */
export const isBenefitsPath = (pathname: string) =>
  pathname === BENEFITS_BASE || pathname.startsWith(`${BENEFITS_BASE}/programs/`);
