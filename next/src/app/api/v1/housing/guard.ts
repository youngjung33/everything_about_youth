import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { HOUSING_FEATURE_ID } from "@/features/housing/feature";
import { getFeatureFlags } from "@/features/registry";

/** 임대주택 서비스가 꺼져 있으면 SERVICE_DISABLED(503)를 던진다. 임대주택 API 라우트가 맨 앞에서 호출한다. */
export function assertHousingEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), HOUSING_FEATURE_ID);
}
