import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { BENEFITS_FEATURE_ID } from "@/features/benefits/feature";
import { getFeatureFlags } from "@/features/registry";

export function assertBenefitsEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), BENEFITS_FEATURE_ID);
}
