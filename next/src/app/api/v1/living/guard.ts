import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { LIVING_FEATURE_ID } from "@/features/living/feature";
import { getFeatureFlags } from "@/features/registry";

/** 이사·생활 섹션이 꺼져 있으면 SERVICE_DISABLED(503)를 던진다. */
export function assertLivingEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), LIVING_FEATURE_ID);
}

