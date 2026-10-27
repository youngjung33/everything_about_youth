import { FeatureFlags, type FeatureDefinition } from "@/common/application/feature-flags";
import { getCommonContainer, type CommonContainer } from "@/common/infrastructure/container";
import { createFeatureFlagStore } from "@/common/infrastructure/persistence/create-stores";
import { benefitsFeature } from "./benefits/feature";
import { financeFeature } from "./finance/feature";
import { housingFeature } from "./housing/feature";
import { jobsFeature } from "./jobs/feature";
import { livingFeature } from "./living/feature";

/**
 * 서버가 제공하는 서비스 전체. **서비스를 추가하면 여기에 한 줄을 더한다.**
 * 각 서비스의 기본값은 그 서비스의 feature.ts 에 있고, 운영 중 바꾼 값은 DB(feature_flags)에 있다.
 */
export const FEATURES: FeatureDefinition[] = [
  housingFeature,
  benefitsFeature,
  financeFeature,
  jobsFeature,
  livingFeature,
];

export function createFeatureFlags(common: CommonContainer, definitions: FeatureDefinition[] = FEATURES): FeatureFlags {
  return new FeatureFlags(definitions, createFeatureFlagStore(common.persistence), common.clock, common.logger);
}

const globalKey = Symbol.for("everything_about_youth.feature-flags");
type GlobalWithFlags = typeof globalThis & { [globalKey]?: FeatureFlags };

/** Next.js 개발 모드의 HMR 에서도 하나만 유지한다. */
export function getFeatureFlags(): FeatureFlags {
  const g = globalThis as GlobalWithFlags;
  if (!g[globalKey]) g[globalKey] = createFeatureFlags(getCommonContainer());
  return g[globalKey]!;
}
