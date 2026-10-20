import { describe, expect, it, vi } from "vitest";
import { silentLogger } from "@/common/application/system";
import { ApiError, ERROR_CODES, buildErrorBody, errorResponse, errorResponseFrom } from "./errors";
import { apiHandler, respond } from "./respond";

describe("오류 코드 표", () => {
  it("코드는 대문자 스네이크 형식이고 상태 코드는 오류 범위이며 문구가 있다", () => {
    for (const [code, def] of Object.entries(ERROR_CODES)) {
      expect(code, code).toMatch(/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/);
      expect(def.status, code).toBeGreaterThanOrEqual(400);
      expect(def.status, code).toBeLessThan(600);
      expect(def.message.trim().length, code).toBeGreaterThan(0);
    }
  });

  it("앱이 의존하는 코드가 빠지지 않았다 (앱의 api_error_code.dart 와 같은 이름)", () => {
    for (const code of [
      "BAD_REQUEST",
      "NOT_FOUND",
      "NOTICE_NOT_FOUND",
      "AUTH_REQUIRED",
      "AUTH_TOKEN_EXPIRED",
      "AUTH_TOKEN_INVALID",
      "AUTH_REFRESH_INVALID",
      "API_VERSION_UNSUPPORTED",
      "APP_UPDATE_REQUIRED",
      "RATE_LIMITED",
      "SERVICE_DISABLED",
      "INTERNAL_ERROR",
    ]) {
      expect(ERROR_CODES, code).toHaveProperty(code);
    }
  });
});

describe("오류 템플릿", () => {
  it("{ error: { code, message } } 형태이고 비어 있는 requestId/details 는 생략한다", () => {
    expect(buildErrorBody("NOT_FOUND")).toEqual({
      error: { code: "NOT_FOUND", message: ERROR_CODES.NOT_FOUND.message },
    });
    expect(buildErrorBody("RATE_LIMITED", { requestId: "r1", details: { retryAfterSeconds: 5 } })).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: ERROR_CODES.RATE_LIMITED.message,
        requestId: "r1",
        details: { retryAfterSeconds: 5 },
      },
    });
    expect(buildErrorBody("BAD_REQUEST", { details: {} }).error).not.toHaveProperty("details");
  });

  it("errorResponse 는 코드의 상태로 응답하고 캐시하지 않는다", async () => {
    const res = errorResponse("SERVICE_DISABLED", { requestId: "r2", headers: { "X-Test": "1" } });
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-test")).toBe("1");
    expect(await res.json()).toMatchObject({ error: { code: "SERVICE_DISABLED", requestId: "r2" } });
  });

  it("ApiError 는 문구와 details 를 바꿀 수 있다", async () => {
    const res = errorResponseFrom(new ApiError("BAD_REQUEST", { message: "source 가 잘못되었습니다.", details: { field: "source" } }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "BAD_REQUEST", message: "source 가 잘못되었습니다.", details: { field: "source" } },
    });
  });

  it("모르는 예외는 내용을 숨기고 INTERNAL_ERROR 로만 알린다 (내부 문구가 새지 않는다)", async () => {
    const seen = vi.fn();
    const res = errorResponseFrom(new Error("SQLITE_ERROR: no such table: secrets"), { requestId: "r3", onUnexpected: seen });

    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("SQLITE");
    expect(text).toContain("INTERNAL_ERROR");
    expect(seen).toHaveBeenCalledOnce();
  });
});

describe("apiHandler", () => {
  const request = (headers: Record<string, string> = {}) =>
    new Request("http://localhost/api/v1/x", { headers });

  it("성공은 그대로 돌려준다", async () => {
    const res = await apiHandler(async () => respond({ status: 201, body: { ok: true } }))(request(), undefined);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("던진 ApiError 를 통합 템플릿으로 바꾸고 요청 번호를 넣는다", async () => {
    const handler = apiHandler(async () => {
      throw new ApiError("NOTICE_NOT_FOUND");
    });
    const res = await handler(request({ "x-request-id": "req-9" }), undefined);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: "NOTICE_NOT_FOUND", message: ERROR_CODES.NOTICE_NOT_FOUND.message, requestId: "req-9" },
    });
  });

  it("예상 못한 오류는 500 INTERNAL_ERROR 이고 로그에만 원인이 남는다", async () => {
    const logger = { ...silentLogger, error: vi.fn() };
    const handler = apiHandler(async () => {
      throw new Error("db password is hunter2");
    }, logger);
    const res = await handler(request({ "x-request-id": "req-1" }), undefined);

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
    expect(logger.error).toHaveBeenCalledOnce();
    expect(String(logger.error.mock.calls[0]![0])).toContain("req-1");
  });
});
