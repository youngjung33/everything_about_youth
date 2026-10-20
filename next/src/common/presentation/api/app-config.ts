import { evaluateUpdateFromHeaders, type AppPolicy, type UpdateStatus } from "@/common/application/app-policy";
import { formatAppVersion } from "@/common/domain/app-version";
import { API_VERSION } from "./version";
import type { ApiResult } from "./respond";

export interface AppConfigDto {
  api: { version: string };
  update: {
    /** none: 괜찮음, optional: 업데이트 권장, required: 강제 업데이트 */
    status: UpdateStatus;
    minVersion: string;
    latestVersion: string;
    /** 업데이트 버튼이 여는 스토어 주소. 모르면 null */
    storeUrl: string | null;
    /** 업데이트 화면에 보여줄 문구. 없으면 null (앱의 기본 문구) */
    message: string | null;
  };
}

/**
 * GET /api/v1/app-config  (토큰 없이 부를 수 있다)
 *
 * 앱이 시작할 때 가장 먼저 불러 업데이트가 필요한지 확인한다. 세션(JWT)보다 먼저 확인할 수 있어야 해서 공개 경로다.
 * 이 호출이 실패해도 앱은 막히지 않는다. 실제 차단은 모든 API 에 걸린 버전 검사(gateway)가 한다.
 */
export function handleGetAppConfig(
  client: { version: string | null; platform: string | null },
  policy: AppPolicy,
): ApiResult<AppConfigDto> {
  const decision = evaluateUpdateFromHeaders(client, policy);
  return {
    status: 200,
    body: {
      api: { version: API_VERSION },
      update: {
        status: decision.status,
        minVersion: formatAppVersion(policy.minVersion),
        latestVersion: formatAppVersion(policy.latestVersion),
        storeUrl: decision.storeUrl,
        message: policy.message,
      },
    },
  };
}
