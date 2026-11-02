import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { FINANCE_FEATURE_ID } from "@/features/finance/feature";
import { getFeatureFlags } from "@/features/registry";

export function assertFinanceEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), FINANCE_FEATURE_ID);
}
