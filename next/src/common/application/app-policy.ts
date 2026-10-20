import { compareAppVersions, parseAppVersion, type AppVersion } from "@/common/domain/app-version";

/**
 * 서버가 정하는 앱 버전 정책. (환경 변수로 관리: README 의 "앱 강제 업데이트" 절)
 *
 * 앱은 스토어로 배포되어 구버전이 계속 살아 있으므로, 서버가 "이 버전 미만은 쓸 수 없다"를 알려 주고
 * 앱이 업데이트 화면으로 막는다.
 */
export interface AppPolicy {
  /** 이 버전 미만은 모든 API 가 APP_UPDATE_REQUIRED 로 막힌다. */
  minVersion: AppVersion;
  /** 스토어에 올라간 최신 버전. 이보다 낮으면 "업데이트 권장"이다. */
  latestVersion: AppVersion;
  storeUrls: { android: string | null; ios: string | null };
  /** 업데이트 화면에 보여줄 안내 문구 (없으면 앱의 기본 문구) */
  message: string | null;
}

export type AppPlatform = "android" | "ios" | "web" | "unknown";

export function normalizePlatform(raw: string | null | undefined): AppPlatform {
  const value = raw?.trim().toLowerCase();
  return value === "android" || value === "ios" || value === "web" ? value : "unknown";
}

export type UpdateStatus = "none" | "optional" | "required";

export interface UpdateDecision {
  status: UpdateStatus;
  storeUrl: string | null;
}

/**
 * 이 앱이 업데이트해야 하는지 판단한다.
 * - 웹은 서버와 같이 배포되므로 항상 최신이다. (막지 않는다)
 * - 버전을 모르거나(헤더 없음/형식 오류) 앱이 아닌 클라이언트(스크립트 등)는 막지 않는다.
 */
export function evaluateUpdate(
  client: { platform: AppPlatform; version: AppVersion | null },
  policy: AppPolicy,
): UpdateDecision {
  const storeUrl = client.platform === "android" || client.platform === "ios" ? policy.storeUrls[client.platform] : null;
  if (client.platform === "web" || !client.version) return { status: "none", storeUrl };

  if (compareAppVersions(client.version, policy.minVersion) < 0) return { status: "required", storeUrl };
  if (compareAppVersions(client.version, policy.latestVersion) < 0) return { status: "optional", storeUrl };
  return { status: "none", storeUrl };
}

/** 요청 헤더 값으로 판단하는 편의 함수 */
export function evaluateUpdateFromHeaders(
  headers: { version: string | null; platform: string | null },
  policy: AppPolicy,
): UpdateDecision {
  return evaluateUpdate(
    { platform: normalizePlatform(headers.platform), version: parseAppVersion(headers.version) },
    policy,
  );
}
