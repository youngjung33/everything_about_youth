import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 청년·공공 일자리. 앱 모듈은 추후 추가. */
export const JOBS_FEATURE_ID = "jobs";

export const jobsFeature: FeatureDefinition = { id: JOBS_FEATURE_ID, defaultEnabled: false };
