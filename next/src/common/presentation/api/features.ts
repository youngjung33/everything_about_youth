import type { FeatureFlags } from "@/common/application/feature-flags";
import { ApiError } from "./errors";
import type { ApiResult } from "./respond";

export interface FeaturesDto {
  features: { id: string; enabled: boolean }[];
}

/**
 * GET /api/v1/features  (앱이 시작할 때 받아 가서 꺼진 서비스를 숨긴다)
 * 서비스가 늘어도 응답 형식은 그대로다. 앱이 모르는 id 는 무시하고, 응답에 없는 서비스는 앱의 기본값을 쓴다.
 */
export async function handleGetFeatures(flags: FeatureFlags): Promise<ApiResult<FeaturesDto>> {
  const states = await flags.list();
  return { status: 200, body: { features: states.map(({ id, enabled }) => ({ id, enabled })) } };
}

/**
 * 꺼진 서비스의 API 를 막는다. 꺼져 있으면 `SERVICE_DISABLED`(503)를 던진다.
 * 서비스 하나를 끄거나 그 서비스가 고장 나도 다른 서비스의 API 에는 영향이 없다.
 */
export async function assertFeatureEnabled(flags: FeatureFlags, id: string): Promise<void> {
  if (!(await flags.isEnabled(id))) throw new ApiError("SERVICE_DISABLED");
}
