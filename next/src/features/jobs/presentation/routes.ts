import { apiPath } from "@/common/presentation/api/version";

/** 일자리 섹션의 URL 경로. 섹션을 다른 경로로 옮기려면 여기만 바꾸면 된다. */
export const JOBS_BASE = "/jobs";
/** 수동 동기화 관리 화면 */
export const JOBS_SYNC_ADMIN_PATH = `${JOBS_BASE}/admin/sync`;
/** 동기화 트리거 API */
export const JOBS_SYNC_API_PATH = apiPath("/jobs/sync");

/** 채용 공고 상세 경로 */
export const postingPath = (id: string) => `${JOBS_BASE}/postings/${id}`;

/** 일자리 화면(목록·상세)인지 — 내 조건 복원 대상 판단용 */
export const isJobsPath = (pathname: string) =>
  pathname === JOBS_BASE || pathname.startsWith(`${JOBS_BASE}/postings/`);
