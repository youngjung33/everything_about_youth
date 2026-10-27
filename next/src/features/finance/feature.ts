import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 청년 주거·자금 (전세·보증금·청약저축 안내). 앱 모듈은 추후 추가. */
export const FINANCE_FEATURE_ID = "finance";

export const financeFeature: FeatureDefinition = { id: FINANCE_FEATURE_ID, defaultEnabled: false };
