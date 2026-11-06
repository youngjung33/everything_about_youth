import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { LIVING_FEATURE_ID } from "@/features/living/feature";
import { getFeatureFlags } from "@/features/registry";

export function assertLivingEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), LIVING_FEATURE_ID);
}
