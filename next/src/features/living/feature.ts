import type { FeatureDefinition } from "@/common/application/feature-flags";

export const LIVING_FEATURE_ID = "living";

export const livingFeature: FeatureDefinition = { id: LIVING_FEATURE_ID, defaultEnabled: true };
