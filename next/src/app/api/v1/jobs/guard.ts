import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { JOBS_FEATURE_ID } from "@/features/jobs/feature";
import { getFeatureFlags } from "@/features/registry";

export function assertJobsEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), JOBS_FEATURE_ID);
}
