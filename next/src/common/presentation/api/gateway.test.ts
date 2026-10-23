import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import type { AppPolicy } from "@/common/application/app-policy";
import { InvalidTokenError, type TokenClaims, type TokenService, type TokenUse } from "@/common/application/auth";
import { FixedWindowRateLimiter } from "@/common/application/rate-limit";
import { parseAppVersion } from "@/common/domain/app-version";
import { runGateway, type GatewayDeps } from "./gateway";
import { RATE_LIMITS } from "./rate-limit-policy";
import { apiPath } from "./version";

const v = (s: string) => parseAppVersion(s)!;

/** "good-<기기 id>" 만 유효한 액세스 토큰 */
const tokens: TokenService = {
  async issue() {
    throw new Error("unused");
  },
  async verify(token: string, use: TokenUse): Promise<TokenClaims> {
    if (token.startsWith("good-") && use === "access") return { sub: token.slice(5), use, jti: "j" };
    throw new InvalidTokenError("invalid");
  },
};

const policy: AppPolicy = {
  minVersion: v("1.2.0"),
  latestVersion: v("1.3.0"),
  storeUrls: { android: "https://play.google.com/x", ios: "https://apps.apple.com/y" },
  message: null,
};

function setup(overrides: Partial<GatewayDeps> = {}) {
  let now = 1_000_000;
  const limiter = new FixedWindowRateLimiter(() => now);
  let n = 0;
  const deps: GatewayDeps = {
    tokens,
    policy,
    limiter,
    corsOrigin: "https://app.example.com",
    now: () => now,
    newRequestId: () => `req-${++n}`,
    ...overrides,
  };
  return { deps, advance: (ms: number) => (now += ms) };
}

const request = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(`http://localhost:3100${path}`, { method: init.method ?? "GET", headers: init.headers });

const authed = (device = "d1", extra: Record<string, string> = {}) => ({
  authorization: `Bearer good-${device}`,
  ...extra,
});
const pass = (res: Response) => res.headers.get("x-middleware-next") === "1";
const errorOf = async (res: Response) => (await res.json()).error as { code: string; message: string; details?: Record<string, unknown>; requestId?: string };

describe("1. API 버전", () => {
  it("v1 이 아니면 410 API_VERSION_UNSUPPORTED (버전 없는 옛 주소 포함)", async () => {
    const { deps } = setup();
    for (const p of ["/api/features", "/api/v2/features", "/api/v0/x", "/api"]) {
      const res = await runGateway(request(p, { headers: authed() }), deps);
      expect(res.status, p).toBe(410);
      expect((await errorOf(res)).code).toBe("API_VERSION_UNSUPPORTED");
    }
  });

  it("버전 오류에도 CORS 와 요청 번호가 붙는다 (웹 앱이 응답을 읽을 수 있도록)", async () => {
    const res = await runGateway(request("/api/features"), setup().deps);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect((await errorOf(res)).requestId).toBe("req-1");
  });
});

describe("2. CORS", () => {
  it("사전 요청은 204 와 앱 헤더 허용 목록을 준다", async () => {
    const res = await runGateway(request(apiPath("/features"), { method: "OPTIONS" }), setup().deps);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(res.headers.get("access-control-allow-headers")).toMatch(/X-App-Version/);
    expect(res.headers.get("access-control-allow-headers")).toMatch(/X-App-Platform/);
    expect(res.headers.get("access-control-allow-methods")).toMatch(/PUT/);
    expect(res.headers.get("access-control-allow-methods")).toMatch(/DELETE/);
    expect(res.headers.get("access-control-expose-headers")).toMatch(/Retry-After/);
  });

  it("운영자용 sync 에는 CORS 를 붙이지 않는다 (다른 출처에서 부를 수 없게)", async () => {
    const res = await runGateway(request(apiPath("/housing/sync"), { method: "POST" }), setup().deps);
    expect(pass(res)).toBe(true);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("3. 앱 버전 (강제 업데이트)", () => {
  const old = { "x-app-version": "1.1.0", "x-app-platform": "android" };

  it("최소 버전 미만이면 모든 API 가 426 APP_UPDATE_REQUIRED 이고 스토어 주소를 준다", async () => {
    const { deps } = setup();
    for (const p of ["/features", "/housing/notices", "/auth/session", "/auth/refresh"]) {
      const res = await runGateway(request(apiPath(p), { method: p.startsWith("/auth") ? "POST" : "GET", headers: authed("d1", old) }), deps);
      expect(res.status, p).toBe(426);
      const error = await errorOf(res);
      expect(error.code).toBe("APP_UPDATE_REQUIRED");
      expect(error.details).toEqual({ minVersion: "1.2.0", storeUrl: "https://play.google.com/x" });
    }
  });

  it("토큰이 없어도 버전이 먼저 걸린다 (업데이트 안내가 우선)", async () => {
    const res = await runGateway(request(apiPath("/features"), { headers: old }), setup().deps);
    expect(res.status).toBe(426);
  });

  it("앱 설정 확인은 낮은 버전도 통과한다 (막힌 앱이 안내를 받아야 한다)", async () => {
    const res = await runGateway(request(apiPath("/app-config"), { headers: old }), setup().deps);
    expect(pass(res)).toBe(true);
  });

  it("최소 버전 이상, 웹, 버전 헤더 없음(스크립트)은 통과한다", async () => {
    const { deps } = setup();
    const ok: Record<string, string>[] = [
      { "x-app-version": "1.2.0", "x-app-platform": "ios" },
      { "x-app-version": "0.0.1", "x-app-platform": "web" },
      {},
    ];
    for (const h of ok) {
      expect(pass(await runGateway(request(apiPath("/features"), { headers: authed("d1", h) }), deps)), JSON.stringify(h)).toBe(true);
    }
  });

  it("안내 문구가 설정돼 있으면 그 문구를 쓴다", async () => {
    const { deps } = setup({ policy: { ...policy, message: "점검을 위해 업데이트가 필요합니다." } });
    const res = await runGateway(request(apiPath("/features"), { headers: old }), deps);
    expect((await errorOf(res)).message).toBe("점검을 위해 업데이트가 필요합니다.");
  });
});

describe("5~6. 인증과 요청 제한", () => {
  it("토큰이 없으면 401 AUTH_REQUIRED + WWW-Authenticate", async () => {
    const res = await runGateway(request(apiPath("/features")), setup().deps);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe('Bearer realm="api"');
    expect((await errorOf(res)).code).toBe("AUTH_REQUIRED");
  });

  it("기기별 한도를 넘으면 429 RATE_LIMITED + Retry-After. 다른 기기는 영향이 없다", async () => {
    const { deps } = setup();
    const call = (device: string) => runGateway(request(apiPath("/features"), { headers: authed(device) }), deps);

    for (let i = 0; i < RATE_LIMITS.api.limit; i++) expect(pass(await call("d1"))).toBe(true);

    const blocked = await call("d1");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");
    expect(blocked.headers.get("ratelimit-remaining")).toBe("0");
    const error = await errorOf(blocked);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toContain("60초");
    expect(error.details).toEqual({ retryAfterSeconds: 60 });

    expect(pass(await call("d2"))).toBe(true);
  });

  it("같은 와이파이(같은 IP)의 서로 다른 기기는 서로의 한도를 쓰지 않는다", async () => {
    const { deps } = setup();
    const ip = { "x-forwarded-for": "203.0.113.5" };
    for (let i = 0; i < RATE_LIMITS.api.limit; i++) {
      await runGateway(request(apiPath("/features"), { headers: authed("d1", ip) }), deps);
    }
    expect(pass(await runGateway(request(apiPath("/features"), { headers: authed("d2", ip) }), deps))).toBe(true);
  });

  it("창이 지나면 다시 허용된다", async () => {
    const { deps, advance } = setup();
    for (let i = 0; i <= RATE_LIMITS.api.limit; i++) {
      await runGateway(request(apiPath("/features"), { headers: authed() }), deps);
    }
    advance(RATE_LIMITS.api.windowMs);
    expect(pass(await runGateway(request(apiPath("/features"), { headers: authed() }), deps))).toBe(true);
  });

  it("세션 발급은 IP 별로 제한한다 (기기 기록이 불어나는 것을 막는다)", async () => {
    const { deps } = setup();
    const call = (ip: string) =>
      runGateway(request(apiPath("/auth/session"), { method: "POST", headers: { "x-forwarded-for": ip } }), deps);

    for (let i = 0; i < RATE_LIMITS.auth.limit; i++) expect(pass(await call("198.51.100.1"))).toBe(true);
    expect((await call("198.51.100.1")).status).toBe(429);
    expect(pass(await call("198.51.100.2"))).toBe(true);
  });

  it("틀린 토큰도 IP 별로 센다 (토큰 추측 방지). 한도를 넘으면 401 이 아니라 429", async () => {
    const { deps } = setup();
    const call = () =>
      runGateway(request(apiPath("/features"), { headers: { authorization: "Bearer forged", "x-forwarded-for": "192.0.2.9" } }), deps);

    for (let i = 0; i < RATE_LIMITS.anonymous.limit; i++) expect((await call()).status).toBe(401);
    expect((await call()).status).toBe(429);
  });

  it("운영자 수집 트리거는 가장 엄격하다", async () => {
    const { deps } = setup();
    const call = () => runGateway(request(apiPath("/housing/sync"), { method: "POST" }), deps);
    for (let i = 0; i < RATE_LIMITS.operator.limit; i++) expect(pass(await call())).toBe(true);
    expect((await call()).status).toBe(429);
  });

  it("limiter 가 null 이면 제한하지 않는다 (RATE_LIMIT_DISABLED)", async () => {
    const { deps } = setup({ limiter: null });
    for (let i = 0; i < RATE_LIMITS.api.limit + 20; i++) {
      expect(pass(await runGateway(request(apiPath("/features"), { headers: authed() }), deps))).toBe(true);
    }
  });
});

describe("7. 통과", () => {
  it("요청 번호, CORS, 제한 안내 헤더를 붙인다", async () => {
    const res = await runGateway(request(apiPath("/features"), { headers: authed() }), setup().deps);
    expect(pass(res)).toBe(true);
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(res.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(res.headers.get("ratelimit-limit")).toBe(String(RATE_LIMITS.api.limit));
    expect(res.headers.get("ratelimit-remaining")).toBe(String(RATE_LIMITS.api.limit - 1));
  });

  it("검증된 세션 id 만 x-client-id 로 넘긴다. 바깥에서 보낸 값은 쓰지 않는다", async () => {
    const { deps } = setup();
    const res = await runGateway(request(apiPath("/auth/logout"), { method: "POST", headers: authed("real", { "x-client-id": "victim" }) }), deps);
    expect(pass(res)).toBe(true);
    expect(res.headers.get("x-middleware-request-x-client-id")).toBe("real");
  });

  it("토큰이 필요 없는 공개 경로에서는 위조된 x-client-id 를 지우고 넘기지 않는다", async () => {
    const { deps } = setup();
    const res = await runGateway(request(apiPath("/auth/providers"), { headers: { "x-client-id": "victim" } }), deps);
    expect(pass(res)).toBe(true);
    expect(res.headers.get("x-middleware-request-x-client-id")).toBeNull();
    expect(res.headers.get("x-middleware-override-headers")).not.toContain("x-client-id");
  });

  it("로그아웃과 회원 탈퇴는 토큰이 있어야 한다 (공개 경로가 아니다)", async () => {
    const { deps } = setup();
    for (const p of ["/auth/logout", "/auth/account/delete"]) {
      const res = await runGateway(request(apiPath(p), { method: "POST" }), deps);
      expect(res.status, p).toBe(401);
    }
  });

  it("로그인 시작·교환·콜백과 업체 목록은 토큰 없이 부를 수 있다 (로그인 전이므로)", async () => {
    const { deps } = setup();
    for (const [method, p] of [
      ["GET", "/auth/providers"],
      ["POST", "/auth/sso/start"],
      ["POST", "/auth/sso/exchange"],
      ["GET", "/auth/sso/callback/google"],
    ] as const) {
      expect(pass(await runGateway(request(apiPath(p), { method }), deps)), p).toBe(true);
    }
  });

  it("라우트가 같은 요청 번호를 쓸 수 있도록 요청 헤더로 넘긴다", async () => {
    const res = await runGateway(request(apiPath("/features"), { headers: authed() }), setup().deps);
    expect(res.headers.get("x-middleware-request-x-request-id")).toBe("req-1");
  });
});
