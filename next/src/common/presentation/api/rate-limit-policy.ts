import type { RateLimitPolicy, RateLimitResult } from "@/common/application/rate-limit";
import { APP_CONFIG_PATH, AUTH_ENTRY_PATHS, HEALTH_PATH, OPERATOR_API_PATHS, type AuthorizationResult } from "./auth";

const MINUTE = 60_000;

/**
 * 요청 제한 값. 숫자를 바꿀 때는 여기만 고친다.
 *
 * - 로그인한 기기(JWT 의 기기 id)는 기기별로 센다. 같은 와이파이를 쓰는 사람끼리 서로 막지 않으려는 것이다.
 * - 토큰이 없거나 틀린 요청, 세션 발급처럼 기기를 알 수 없는 입구는 IP 별로 센다.
 */
export const RATE_LIMITS = {
  /** 앱용 API (기기별) */
  api: { name: "api", limit: 120, windowMs: MINUTE },
  /** 세션 발급/갱신 (IP 별). 반복 호출로 기기 기록이 불어나는 것을 막는다. */
  auth: { name: "auth", limit: 30, windowMs: MINUTE },
  /** 앱 설정 확인 (IP 별) */
  appConfig: { name: "app-config", limit: 60, windowMs: MINUTE },
  /** 운영자 수집 트리거 (IP 별). 외부 사이트를 긁는 무거운 작업이다. */
  operator: { name: "operator", limit: 3, windowMs: MINUTE },
  /** 토큰이 없거나 틀린 요청 (IP 별). 토큰 추측을 막는다. */
  anonymous: { name: "anonymous", limit: 30, windowMs: MINUTE },
} as const satisfies Record<string, RateLimitPolicy>;

export interface RateLimitTarget {
  policy: RateLimitPolicy;
  /** 정책 안에서 구분하는 키 (`device:…` 또는 `ip:…`) */
  key: string;
}

/**
 * 이 호출을 어떤 정책으로, 무엇을 기준으로 셀지 정한다.
 * `auth` 는 [authorizeApiRequest] 결과다. (토큰이 맞으면 기기 id 를 알 수 있다)
 */
export function chooseRateLimit(pathname: string, auth: AuthorizationResult, ip: string): RateLimitTarget {
  const byIp = (policy: RateLimitPolicy): RateLimitTarget => ({ policy, key: `ip:${ip}` });

  if (AUTH_ENTRY_PATHS.includes(pathname)) return byIp(RATE_LIMITS.auth);
  if (pathname === APP_CONFIG_PATH || pathname === HEALTH_PATH) return byIp(RATE_LIMITS.appConfig);
  if (OPERATOR_API_PATHS.includes(pathname)) return byIp(RATE_LIMITS.operator);
  if (!auth.ok || !auth.clientId) return byIp(RATE_LIMITS.anonymous);
  return { policy: RATE_LIMITS.api, key: `device:${auth.clientId}` };
}

/**
 * 요청자의 IP. 프록시/로드밸런서 뒤에 있으면 `X-Forwarded-For` 의 첫 값이 실제 IP 다.
 * 이 헤더는 직접 접속하는 클라이언트가 위조할 수 있으므로, 운영에서는 **앞단 프록시가 이 헤더를 덮어쓰도록** 구성해야 한다.
 */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "local";
}

/** 응답에 붙이는 제한 안내 헤더 (IETF RateLimit 헤더 초안 형식) */
export function rateLimitHeaders(result: RateLimitResult, now: number): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.max(0, Math.ceil((result.resetAtMs - now) / 1000))),
  };
}
