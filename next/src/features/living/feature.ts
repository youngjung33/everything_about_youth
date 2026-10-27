import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 이사·생활 절차 체크리스트·공식 링크. 앱 모듈은 추후 추가. */
export const LIVING_FEATURE_ID = "living";

export const livingFeature: FeatureDefinition = { id: LIVING_FEATURE_ID, defaultEnabled: false };
