import { describe, expect, it } from "vitest";
import {
  AuthError,
  InvalidTokenError,
  type AuthService,
  type SessionTokens,
  type TokenClaims,
  type TokenService,
  type TokenUse,
} from "@/common/application/auth";
import { authorizeApiRequest, extractBearerToken, handleRefresh, handleStartSession } from "./auth";
import { ApiError } from "./errors";
import { apiPath } from "./version";

/** "good-<sub>" 만 유효한 액세스 토큰, "old" 는 만료, "refresh-token" 은 종류 불일치. */
const tokens: TokenService = {
  async issue() {
    throw new Error("unused");
  },
  async verify(token: string, use: TokenUse): Promise<TokenClaims> {
    if (token === "old") throw new InvalidTokenError("expired");
    if (token.startsWith("good-") && use === "access") return { sub: token.slice(5), use, jti: "j" };
    throw new InvalidTokenError("invalid");
  },
};

const req = (pathname: string, authorization: string | null = null, method = "GET") => ({
  method,
  pathname,
  authorization,
});

const FEATURES = apiPath("/features");

describe("extractBearerToken", () => {
  it("Bearer 형식만 받아들인다", () => {
    expect(extractBearerToken("Bearer abc")).toBe("abc");
    expect(extractBearerToken("bearer abc")).toBe("abc");
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("Bearer a b")).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });
});

describe("authorizeApiRequest", () => {
  it("유효한 토큰이면 통과하고 기기 id 를 돌려준다", async () => {
    expect(await authorizeApiRequest(req(FEATURES, "Bearer good-d1"), tokens)).toEqual({
      ok: true,
      clientId: "d1",
    });
  });

  it("토큰이 없으면 AUTH_REQUIRED", async () => {
    const r = await authorizeApiRequest(req(apiPath("/housing/notices")), tokens);
    expect(r).toMatchObject({ ok: false, code: "AUTH_REQUIRED" });
    if (!r.ok) expect(r.wwwAuthenticate).toBe('Bearer realm="api"');
  });

  it("만료되면 AUTH_TOKEN_EXPIRED (앱이 리프레시하라는 신호)", async () => {
    const r = await authorizeApiRequest(req(FEATURES, "Bearer old"), tokens);
    expect(r).toMatchObject({ ok: false, code: "AUTH_TOKEN_EXPIRED" });
  });

  it("위조/종류 불일치는 AUTH_TOKEN_INVALID", async () => {
    for (const h of ["Bearer forged", "Bearer refresh-token", "Basic good-d1"]) {
      const r = await authorizeApiRequest(req(FEATURES, h), tokens);
      expect(r.ok).toBe(false);
    }
    const r = await authorizeApiRequest(req(FEATURES, "Bearer forged"), tokens);
    expect(r).toMatchObject({ code: "AUTH_TOKEN_INVALID" });
  });

  it("공개 경로(세션 발급/갱신, 앱 설정)와 OPTIONS, 운영자용 sync 는 토큰 없이 통과", async () => {
    expect((await authorizeApiRequest(req(apiPath("/auth/session"), null, "POST"), tokens)).ok).toBe(true);
    expect((await authorizeApiRequest(req(apiPath("/auth/refresh"), null, "POST"), tokens)).ok).toBe(true);
    expect((await authorizeApiRequest(req(apiPath("/app-config")), tokens)).ok).toBe(true);
    expect((await authorizeApiRequest(req(apiPath("/housing/notices"), null, "OPTIONS"), tokens)).ok).toBe(true);
    // SSO: 로그인 화면, 시작, 티켓 교환, 4곳의 콜백(브라우저가 토큰 없이 돌아온다)
    for (const p of [
      apiPath("/auth/providers"),
      apiPath("/auth/sso/start"),
      apiPath("/auth/sso/exchange"),
      ...["google", "apple", "naver", "kakao"].map((id) => apiPath(`/auth/sso/callback/${id}`)),
    ]) {
      expect((await authorizeApiRequest(req(p), tokens)).ok, p).toBe(true);
    }
    expect((await authorizeApiRequest(req(apiPath("/housing/sync"), null, "POST"), tokens)).ok).toBe(true);
  });

  it("비슷한 경로로 공개 경로를 우회할 수 없다", async () => {
    for (const p of [
      apiPath("/auth/session/x"),
      apiPath("/auth"),
      apiPath("/auth/sessions"),
      apiPath("/app-config/x"),
      apiPath("/housing/sync/x"),
      apiPath("/auth/sso/callback/other"), // 모르는 업체
      apiPath("/auth/sso/callback/google/x"),
      apiPath("/auth/sso/start/x"),
      // 로그아웃과 회원 탈퇴는 세션이 있어야 한다 (공개가 아니다)
      apiPath("/auth/logout"),
      apiPath("/auth/account/delete"),
      "/API/v1/features",
      "/api/auth/session", // 버전 없는 옛 경로
    ]) {
      expect((await authorizeApiRequest(req(p), tokens)).ok, p).toBe(false);
    }
  });
});

const sessionTokens: SessionTokens = {
  tokenType: "Bearer",
  accessToken: "a",
  accessExpiresIn: 900,
  refreshToken: "r",
  refreshExpiresIn: 3600,
  member: false,
};

function fakeAuth(overrides: Partial<Record<"startSession" | "refresh", () => Promise<SessionTokens>>> = {}) {
  return {
    startSession: overrides.startSession ?? (async () => sessionTokens),
    refresh: overrides.refresh ?? (async () => sessionTokens),
  } as unknown as AuthService;
}

describe("세션 핸들러", () => {
  it("handleStartSession 은 토큰 쌍을 돌려준다", async () => {
    expect(await handleStartSession(fakeAuth())).toEqual({ status: 200, body: sessionTokens });
  });

  it("handleRefresh: 정상", async () => {
    expect(await handleRefresh({ refreshToken: "r" }, fakeAuth())).toEqual({ status: 200, body: sessionTokens });
  });

  it("handleRefresh: 본문이 이상하면 BAD_REQUEST", async () => {
    for (const body of [undefined, null, {}, { refreshToken: 1 }, { refreshToken: "" }, "x"]) {
      await expect(handleRefresh(body, fakeAuth())).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("handleRefresh: 만료/위조/폐기는 모두 같은 AUTH_REFRESH_INVALID", async () => {
    const cases = [new InvalidTokenError("expired"), new InvalidTokenError("invalid"), new AuthError("invalid_refresh", "x")];
    for (const err of cases) {
      const promise = handleRefresh(
        { refreshToken: "r" },
        fakeAuth({
          refresh: async () => {
            throw err;
          },
        }),
      );
      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ code: "AUTH_REFRESH_INVALID" });
    }
  });

  it("handleRefresh: 예상 못한 오류는 그대로 던진다(apiHandler 가 INTERNAL_ERROR 처리)", async () => {
    await expect(
      handleRefresh(
        { refreshToken: "r" },
        fakeAuth({
          refresh: async () => {
            throw new Error("db down");
          },
        }),
      ),
    ).rejects.toThrow("db down");
  });
});
