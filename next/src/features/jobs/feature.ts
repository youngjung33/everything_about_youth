import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 청년·공공 일자리 (채용 공고 모음). */
export const JOBS_FEATURE_ID = "jobs";

export const jobsFeature: FeatureDefinition = { id: JOBS_FEATURE_ID, defaultEnabled: true };
