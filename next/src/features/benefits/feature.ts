import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 청년 혜택·정책 (온통청년·지자체 지원 등). 앱 모듈은 추후 추가. */
export const BENEFITS_FEATURE_ID = "benefits";

export const benefitsFeature: FeatureDefinition = { id: BENEFITS_FEATURE_ID, defaultEnabled: false };
