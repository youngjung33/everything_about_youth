import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 청년 혜택·정책. Flutter `BenefitsModule.id` 와 같아야 한다. */
export const BENEFITS_FEATURE_ID = "benefits";

export const benefitsFeature: FeatureDefinition = { id: BENEFITS_FEATURE_ID, defaultEnabled: true };
