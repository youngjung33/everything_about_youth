import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { beforeAll, describe, expect, it } from "vitest";
import { JoseTokenService } from "@/common/infrastructure/auth/jwt-token-service";
import { loadAuthConfig } from "@/common/infrastructure/config/auth-config";
import { systemClock } from "@/common/application/system";
import { apiPath } from "@/common/presentation/api/version";
import { config, proxy } from "./proxy";

/**
 * 실제 JWT 와 실제 gateway 를 연결한 통합 확인. (세부 동작은 gateway.test.ts)
 * 요청 제한은 프로세스 메모리에 쌓이므로 테스트마다 다른 IP 를 쓴다.
 */
const ENV = { NODE_ENV: "test", JWT_SECRET: "proxy-test-secret-proxy-test-secret-123" };

beforeAll(() => {
  process.env.JWT_SECRET = ENV.JWT_SECRET;
});

let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;
const url = (p: string) => `http://localhost:3100${p}`;
const isPassThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";
const get = (p: string, headers: Record<string, string> = {}) =>
  new NextRequest(url(p), { headers: { "x-forwarded-for": nextIp(), ...headers } });
const post = (p: string) => new NextRequest(url(p), { method: "POST", headers: { "x-forwarded-for": nextIp() } });

describe("proxy 는 모든 /api/* 를 검사한다", () => {
  it("matcher 가 앱 API 와 앞으로 생길 API 경로를 모두 덮는다", () => {
    for (const p of [
      apiPath("/features"),
      apiPath("/housing/notices"),
      apiPath("/housing/notices/abc"),
      apiPath("/housing/meta"),
      apiPath("/auth/session"),
      apiPath("/app-config"),
      apiPath("/jobs/anything/new"),
      "/api/v2/anything",
      "/api/features",
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, url: p }), p).toBe(true);
    }
    expect(unstable_doesMiddlewareMatch({ config, url: "/housing" })).toBe(false);
  });

  it("토큰 없이 데이터 API 를 부르면 401 AUTH_REQUIRED 이고 CORS 헤더와 요청 번호가 붙는다", async () => {
    for (const p of ["/features", "/housing/notices", "/housing/meta", "/housing/notices/1"]) {
      const res = await proxy(get(apiPath(p)));
      expect(res.status, p).toBe(401);
      expect(res.headers.get("www-authenticate")).toContain("Bearer");
      expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
      expect(res.headers.get("x-request-id")).toBeTruthy();
      const body = await res.json();
      expect(body).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
      expect(body.error.requestId).toBe(res.headers.get("x-request-id"));
    }
  });

  it("유효한 액세스 토큰이면 통과한다", async () => {
    const tokens = new JoseTokenService(loadAuthConfig(ENV), systemClock);
    const { token } = await tokens.issue("access", "device-1");
    const res = await proxy(get(apiPath("/features"), { authorization: `Bearer ${token}` }));
    expect(isPassThrough(res)).toBe(true);
    expect(res.headers.get("ratelimit-limit")).toBeTruthy();
  });

  it("리프레시 토큰이나 위조 토큰으로는 데이터 API 를 못 부른다", async () => {
    const tokens = new JoseTokenService(loadAuthConfig(ENV), systemClock);
    const { token } = await tokens.issue("refresh", "device-1");
    for (const t of [token, "forged.token.value"]) {
      const res = await proxy(get(apiPath("/features"), { authorization: `Bearer ${t}` }));
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: { code: "AUTH_TOKEN_INVALID" } });
    }
  });

  it("세션 발급/갱신 입구, 앱 설정, CORS 사전 요청은 토큰 없이 통과한다", async () => {
    expect(isPassThrough(await proxy(post(apiPath("/auth/session"))))).toBe(true);
    expect(isPassThrough(await proxy(post(apiPath("/auth/refresh"))))).toBe(true);
    expect(isPassThrough(await proxy(get(apiPath("/app-config"))))).toBe(true);

    const preflight = await proxy(
      new NextRequest(url(apiPath("/features")), {
        method: "OPTIONS",
        headers: { "x-forwarded-for": nextIp(), "access-control-request-headers": "x-app-version" },
      }),
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-headers")).toContain("X-App-Version");
  });

  it("버전이 없거나 지원하지 않는 주소는 410 API_VERSION_UNSUPPORTED", async () => {
    for (const p of ["/api/features", "/api/housing/notices", "/api/v0/features", "/api/v2/features"]) {
      const res = await proxy(get(p));
      expect(res.status, p).toBe(410);
      expect(await res.json()).toMatchObject({ error: { code: "API_VERSION_UNSUPPORTED" } });
    }
  });
});
