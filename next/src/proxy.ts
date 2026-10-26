import type { NextRequest } from "next/server";
import type { RateLimiter } from "@/common/application/rate-limit";
import { createRateLimiter } from "@/common/infrastructure/rate-limit/create-rate-limiter";
import { loadAppPolicy } from "@/common/infrastructure/config/app-policy-config";
import { createTokenService } from "@/common/infrastructure/auth/token-service-factory";
import { runGateway } from "@/common/presentation/api/gateway";

/**
 * 모든 `/api/*` 요청의 입구. (Next 16 의 proxy; 예전 middleware)
 * API 버전, CORS, 앱 버전(강제 업데이트), JWT, 요청 제한을 한곳에서 처리한다. 자세한 순서는 `gateway.ts`.
 * 새 API 를 추가해도 여기를 고칠 필요가 없다. 예외 경로는 `common/presentation/api/auth.ts` 에서만 관리한다.
 *
 * 이 파일은 네이티브 모듈(better-sqlite3)을 가져오면 안 된다. 토큰은 서명만 검사하는 stateless 방식이라 DB 를 쓰지 않는다.
 * 요청 제한은 서버 한 대의 메모리에서 센다. (여러 대로 늘리면 `RateLimiter` 를 공유 저장소 구현으로 바꾼다)
 */

const globalForLimiter = globalThis as unknown as { __rateLimiter?: RateLimiter };

function rateLimiter(): RateLimiter | null {
  return (globalForLimiter.__rateLimiter ??= createRateLimiter());
}

export async function proxy(request: NextRequest) {
  return runGateway(request, {
    tokens: createTokenService(),
    policy: loadAppPolicy(),
    limiter: rateLimiter(),
    corsOrigin: process.env.API_CORS_ORIGIN ?? "*",
  });
}

export const config = {
  matcher: "/api/:path*",
};
