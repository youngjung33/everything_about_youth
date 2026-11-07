import { apiPath } from "@/common/presentation/api/version";

export const JOBS_BASE = "/jobs";
export const JOBS_SYNC_ADMIN_PATH = `${JOBS_BASE}/admin/sync`;
export const JOBS_SYNC_API_PATH = apiPath("/jobs/sync");

export const postingPath = (id: string) => `${JOBS_BASE}/postings/${id}`;

export const isJobsPath = (pathname: string) =>
  pathname === JOBS_BASE || pathname.startsWith(`${JOBS_BASE}/postings/`);
