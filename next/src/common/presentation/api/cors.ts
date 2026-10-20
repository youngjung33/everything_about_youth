/**
 * 앱(Flutter Web 등 다른 출처)이 API 를 부를 수 있도록 CORS 헤더를 만든다. 모든 응답에 gateway 가 한 곳에서 붙인다.
 *
 * - JWT 는 `Authorization` 헤더로 보내고 쿠키를 쓰지 않으므로 출처가 "*" 여도 자격 증명이 새지 않는다.
 * - 앱이 보내는 `X-App-Version`/`X-App-Platform` 을 허용해야 웹 앱의 사전 요청(preflight)이 통과한다.
 * - 앱이 읽어야 하는 응답 헤더(`Retry-After` 등)는 노출해야 한다.
 * - 운영자용 경로(수집 트리거)에는 붙이지 않는다. (다른 출처에서 부를 수 없게)
 * - 운영에서는 API_CORS_ORIGIN 에 앱 도메인을 지정하세요. (기본 "*")
 */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Version, X-App-Platform",
    "Access-Control-Expose-Headers": "Retry-After, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, X-Request-Id",
    "Access-Control-Max-Age": "600",
  };
}
