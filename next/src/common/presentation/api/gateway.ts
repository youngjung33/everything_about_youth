import { NextResponse, type NextRequest } from "next/server";
import { evaluateUpdateFromHeaders, type AppPolicy } from "@/common/application/app-policy";
import type { TokenService } from "@/common/application/auth";
import type { RateLimiter } from "@/common/application/rate-limit";
import { formatAppVersion } from "@/common/domain/app-version";
import { APP_CONFIG_PATH, OPERATOR_API_PATHS, authorizeApiRequest } from "./auth";
import { corsHeaders } from "./cors";
import { errorResponse, type ErrorCode } from "./errors";
import { chooseRateLimit, clientIp, rateLimitHeaders } from "./rate-limit-policy";
import { REQUEST_ID_HEADER } from "./respond";
import { SUPPORTED_API_VERSIONS, splitApiPath } from "./version";

export interface GatewayDeps {
  tokens: TokenService;
  policy: AppPolicy;
  /** null 이면 요청 제한을 하지 않는다. (RATE_LIMIT_DISABLED) */
  limiter: RateLimiter | null;
  corsOrigin: string;
  now?: () => number;
  newRequestId?: () => string;
}

/**
 * 모든 `/api/*` 요청이 라우트에 닿기 전에 지나는 입구. (`src/proxy.ts` 가 이 함수를 부른다)
 *
 * 순서 (앞 단계에서 걸리면 뒤는 실행하지 않는다):
 *  1. API 버전 확인       지원하지 않는 버전(또는 버전 없는 주소)  → 410 API_VERSION_UNSUPPORTED
 *  2. CORS 사전 요청       OPTIONS → 204
 *  3. 앱 버전 확인         `X-App-Version` 이 최소 버전 미만      → 426 APP_UPDATE_REQUIRED
 *  4. 인증(JWT)            결과는 아직 응답하지 않고 기기 id 만 얻는다
 *  5. 요청 제한            초과 → 429 RATE_LIMITED  (토큰이 틀린 요청도 제한을 센다: 토큰 추측 방지)
 *  6. 인증 실패 응답        401 AUTH_*
 *  7. 통과                요청 번호·CORS·제한 안내 헤더를 붙여 라우트로
 *
 * 모든 오류는 `errors.ts` 의 같은 템플릿이고, 모든 응답에 CORS 와 `X-Request-Id` 가 붙는다.
 */
export async function runGateway(request: NextRequest, deps: GatewayDeps): Promise<Response> {
  const now = deps.now ?? Date.now;
  const requestId = (deps.newRequestId ?? (() => crypto.randomUUID()))();
  const { pathname } = request.nextUrl;

  const operator = OPERATOR_API_PATHS.includes(pathname);
  const common: Record<string, string> = {
    ...(operator ? {} : corsHeaders(deps.corsOrigin)),
    "X-Request-Id": requestId,
  };
  const fail = (code: ErrorCode, options: Parameters<typeof errorResponse>[1] = {}) =>
    errorResponse(code, { ...options, requestId, headers: { ...common, ...options.headers } });

  // 1. API 버전
  const split = splitApiPath(pathname);
  if (!split?.version || !SUPPORTED_API_VERSIONS.includes(split.version)) return fail("API_VERSION_UNSUPPORTED");

  // 2. CORS 사전 요청
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: common });

  // 3. 앱 버전 (앱 설정 확인은 막지 않는다. 막힌 앱이 업데이트 안내를 받아야 하므로)
  if (!operator && pathname !== APP_CONFIG_PATH) {
    const decision = evaluateUpdateFromHeaders(
      { version: request.headers.get("x-app-version"), platform: request.headers.get("x-app-platform") },
      deps.policy,
    );
    if (decision.status === "required") {
      return fail("APP_UPDATE_REQUIRED", {
        message: deps.policy.message ?? undefined,
        details: { minVersion: formatAppVersion(deps.policy.minVersion), storeUrl: decision.storeUrl },
      });
    }
  }

  // 4~5. 인증 정보로 기기를 알아내고, 그 기준으로 요청 제한
  const auth = await authorizeApiRequest(
    { method: request.method, pathname, authorization: request.headers.get("authorization") },
    deps.tokens,
  );

  let limitHeaders: Record<string, string> = {};
  if (deps.limiter) {
    const target = chooseRateLimit(pathname, auth, clientIp(request.headers));
    const result = deps.limiter.check(target.key, target.policy);
    limitHeaders = rateLimitHeaders(result, now());
    if (!result.allowed) {
      return fail("RATE_LIMITED", {
        message: `요청이 너무 많습니다. ${result.retryAfterSec}초 후 다시 시도해 주세요.`,
        details: { retryAfterSeconds: result.retryAfterSec },
        headers: { ...limitHeaders, "Retry-After": String(result.retryAfterSec) },
      });
    }
  }

  // 6. 인증 실패
  if (!auth.ok) return fail(auth.code, { headers: { ...limitHeaders, "WWW-Authenticate": auth.wwwAuthenticate } });

  // 7. 통과. 라우트가 오류 응답에 같은 요청 번호를 쓸 수 있게 요청 헤더에도 넣는다.
  const forwarded = new Headers(request.headers);
  forwarded.set(REQUEST_ID_HEADER, requestId);
  const response = NextResponse.next({ request: { headers: forwarded } });
  for (const [name, value] of Object.entries({ ...common, ...limitHeaders })) response.headers.set(name, value);
  return response;
}
