import { apiPath } from "@/common/presentation/api/version";

/** 금융·자금 섹션의 URL 경로. 섹션을 다른 경로로 옮기려면 여기만 바꾸면 된다. */
export const FINANCE_BASE = "/finance";
/** 수동 동기화 관리 화면 */
export const FINANCE_SYNC_ADMIN_PATH = `${FINANCE_BASE}/admin/sync`;
/** 동기화 트리거 API */
export const FINANCE_SYNC_API_PATH = apiPath("/finance/sync");

/** 상품 상세 경로 */
export const programPath = (id: string) => `${FINANCE_BASE}/programs/${id}`;

/** 금융·자금 화면(목록·상세)인지 — 내 조건 복원 대상 판단용 */
export const isFinancePath = (pathname: string) =>
  pathname === FINANCE_BASE || pathname.startsWith(`${FINANCE_BASE}/programs/`);
