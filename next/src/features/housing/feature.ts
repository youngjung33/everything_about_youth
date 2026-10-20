import type { FeatureDefinition } from "@/common/application/feature-flags";

/** 임대주택 서비스의 켜기/끄기 키. 앱의 `FeatureModule.id` 와 같아야 한다. */
export const HOUSING_FEATURE_ID = "housing";

export const housingFeature: FeatureDefinition = { id: HOUSING_FEATURE_ID, defaultEnabled: true };
