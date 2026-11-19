import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { BENEFITS_FEATURE_ID } from "@/features/benefits/feature";
import { getFeatureFlags } from "@/features/registry";

/** 청년 혜택 섹션이 꺼져 있으면 SERVICE_DISABLED(503)를 던진다. */
export function assertBenefitsEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), BENEFITS_FEATURE_ID);
}

