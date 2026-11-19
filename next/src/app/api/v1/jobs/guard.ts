import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { JOBS_FEATURE_ID } from "@/features/jobs/feature";
import { getFeatureFlags } from "@/features/registry";

/** 일자리 섹션이 꺼져 있으면 SERVICE_DISABLED(503)를 던진다. */
export function assertJobsEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), JOBS_FEATURE_ID);
}

