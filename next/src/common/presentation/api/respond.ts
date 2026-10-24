import { consoleLogger, type Logger } from "@/common/application/system";
import { getRuntimeEnv } from "@/common/infrastructure/config/runtime-env-config";
import { errorResponseFrom } from "./errors";

/**
 * HTTP 와 무관한 API 처리 로직의 성공 결과. 오류는 값으로 돌려주지 않고 `ApiError` 를 던진다.
 * (그래서 성공 경로에서 `body` 의 타입이 하나로 정해진다)
 */
export interface ApiResult<T> {
  status: number;
  body: T;
}

/** 요청 번호 헤더. proxy 가 요청마다 만들어 붙이고, 응답 헤더로도 돌려준다. */
export const REQUEST_ID_HEADER = "x-request-id";

export function requestIdOf(request: Request): string | null {
  return request.headers.get(REQUEST_ID_HEADER);
}

/**
 * 검증된 세션 id. gateway 가 JWT 를 확인한 뒤에만 채우고, 바깥에서 들어온 같은 이름의 헤더는 항상 지운다.
 * (라우트가 토큰을 다시 풀지 않고 "이 요청이 누구의 세션인가"를 알 수 있다)
 */
export const CLIENT_ID_HEADER = "x-client-id";

export function clientIdOf(request: Request): string | null {
  return request.headers.get(CLIENT_ID_HEADER);
}

/** 성공 응답. 기본은 캐시하지 않는다. (서비스 켜짐/버전 같은 값이 바로 반영되어야 해서) */
export function respond<T>(result: ApiResult<T>, headers: Record<string, string> = {}): Response {
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store", ...headers } });
}

type RouteHandler<Ctx> = (request: Request, ctx: Ctx) => Response | Promise<Response>;

/**
 * 모든 API 라우트를 감싼다. 안에서 던진 오류를 통합 오류 템플릿으로 바꿔 응답한다.
 *
 * - `ApiError` → 그 코드와 문구
 * - 그 밖의 예외 → 서버 로그에만 남기고 앱에는 `INTERNAL_ERROR` 만 준다. (내부 문구가 새지 않게)
 *
 * 라우트마다 try/catch 를 쓰지 말고 이것을 쓴다.
 *
 * ```ts
 * export const GET = apiHandler(async (request) => respond(await handleSomething(...)));
 * ```
 */
export function apiHandler<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
  logger: Logger = consoleLogger,
): (request: Request, ctx: Ctx) => Promise<Response> {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (thrown) {
      const requestId = requestIdOf(request);
      return errorResponseFrom(thrown, {
        requestId,
        onUnexpected: (error) =>
          logger.error(
            `[api:${getRuntimeEnv().appEnv}] ${request.method} ${new URL(request.url).pathname} 실패 (requestId=${requestId ?? "-"})`,
            { error },
          ),
      });
    }
  };
}
