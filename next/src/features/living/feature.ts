import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 생활·행정 안내(독립 생활·서류 등) 섹션 플래그 ID */
export const LIVING_FEATURE_ID = "living";

export const livingFeature: FeatureDefinition = { id: LIVING_FEATURE_ID, defaultEnabled: true };
