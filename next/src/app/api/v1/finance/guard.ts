import { assertFeatureEnabled } from "@/common/presentation/api/features";
import { FINANCE_FEATURE_ID } from "@/features/finance/feature";
import { getFeatureFlags } from "@/features/registry";

/** 주거·자금 섹션이 꺼져 있으면 SERVICE_DISABLED(503)를 던진다. */
export function assertFinanceEnabled(): Promise<void> {
  return assertFeatureEnabled(getFeatureFlags(), FINANCE_FEATURE_ID);
}

