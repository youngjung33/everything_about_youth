/**
 * 서버가 앱에 돌려주는 **모든 오류의 단일 템플릿**.
 *
 * ```json
 * { "error": { "code": "RATE_LIMITED", "message": "요청이 너무 많습니다...", "requestId": "…", "details": { … } } }
 * ```
 *
 * - `code`      앱이 분기하는 값. 아래 `ERROR_CODES` 에만 정의하고 문자열을 다른 곳에 쓰지 않는다.
 *               (앱의 `core/network/api_error_code.dart` 와 같은 이름을 쓴다)
 * - `message`   사용자에게 그대로 보여줘도 되는 한글 문장. 내부 오류 문구(`e.message`)는 절대 넣지 않는다.
 * - `requestId` 로그와 대조할 요청 번호. (proxy 가 만들어 응답 헤더 `X-Request-Id` 로도 준다)
 * - `details`   코드별 부가 정보 (예: RATE_LIMITED → retryAfterSeconds, APP_UPDATE_REQUIRED → storeUrl)
 *
 * 새 오류가 필요하면 `ERROR_CODES` 에 한 줄을 더하고, 던질 곳에서 `throw new ApiError("코드")` 하면 끝이다.
 */
export const ERROR_CODES = {
  // 요청
  BAD_REQUEST: { status: 400, message: "요청이 올바르지 않습니다." },
  NOT_FOUND: { status: 404, message: "요청한 주소를 찾을 수 없습니다." },
  NOTICE_NOT_FOUND: { status: 404, message: "공고를 찾을 수 없습니다." },

  // 인증
  AUTH_REQUIRED: { status: 401, message: "인증이 필요합니다." },
  AUTH_TOKEN_EXPIRED: { status: 401, message: "인증이 만료되었습니다. 다시 시도해 주세요." },
  AUTH_TOKEN_INVALID: { status: 401, message: "인증 정보가 올바르지 않습니다." },
  AUTH_REFRESH_INVALID: { status: 401, message: "세션이 유효하지 않습니다. 다시 시작해 주세요." },
  FORBIDDEN: { status: 403, message: "허용되지 않은 요청입니다." },
  OPERATOR_DISABLED: { status: 403, message: "운영 환경에서는 웹 수집이 비활성화되어 있습니다." },

  // 앱 버전과 API 버전
  API_VERSION_UNSUPPORTED: {
    status: 410,
    message: "지원하지 않는 버전입니다. 앱을 최신 버전으로 업데이트해 주세요.",
  },
  APP_UPDATE_REQUIRED: { status: 426, message: "앱을 최신 버전으로 업데이트해야 사용할 수 있습니다." },

  // 제한과 장애
  RATE_LIMITED: { status: 429, message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
  SERVICE_DISABLED: { status: 503, message: "이 서비스는 현재 사용할 수 없습니다." },
  INTERNAL_ERROR: { status: 500, message: "서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요." },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

/** 던지면 라우트의 `apiHandler` 가 위 템플릿으로 바꿔 응답한다. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  readonly headers?: Record<string, string>;

  /** `message` 를 주면 기본 문구 대신 쓴다. 사용자에게 보여도 되는 문장만 넣을 것. */
  constructor(
    code: ErrorCode,
    options: { message?: string; details?: Record<string, unknown>; headers?: Record<string, string> } = {},
  ) {
    super(options.message ?? ERROR_CODES[code].message);
    this.name = "ApiError";
    this.code = code;
    this.details = options.details;
    this.headers = options.headers;
  }
}

export function buildErrorBody(
  code: ErrorCode,
  options: { message?: string; requestId?: string | null; details?: Record<string, unknown> } = {},
): ApiErrorBody {
  return {
    error: {
      code,
      message: options.message ?? ERROR_CODES[code].message,
      ...(options.requestId ? { requestId: options.requestId } : {}),
      ...(options.details && Object.keys(options.details).length > 0 ? { details: options.details } : {}),
    },
  };
}

/** 템플릿으로 만든 오류 응답. (proxy 와 라우트가 같은 함수를 쓴다) */
export function errorResponse(
  code: ErrorCode,
  options: {
    message?: string;
    requestId?: string | null;
    details?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {},
): Response {
  return Response.json(buildErrorBody(code, options), {
    status: ERROR_CODES[code].status,
    headers: { "Cache-Control": "no-store", ...options.headers },
  });
}

/** 던져진 값을 응답으로 바꾼다. 모르는 오류는 내용을 숨기고 INTERNAL_ERROR 로만 알린다. */
export function errorResponseFrom(
  thrown: unknown,
  options: { requestId?: string | null; onUnexpected?: (error: unknown) => void } = {},
): Response {
  if (thrown instanceof ApiError) {
    return errorResponse(thrown.code, {
      message: thrown.message,
      details: thrown.details,
      headers: thrown.headers,
      requestId: options.requestId,
    });
  }
  options.onUnexpected?.(thrown);
  return errorResponse("INTERNAL_ERROR", { requestId: options.requestId });
}
