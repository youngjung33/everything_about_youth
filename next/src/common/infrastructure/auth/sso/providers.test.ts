import { SignJWT, decodeJwt, decodeProtectedHeader, exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { createAppleProvider } from "./apple";
import { createGoogleProvider } from "./google";
import { createKakaoProvider } from "./kakao";
import { createNaverProvider } from "./naver";
import { createSsoProviders } from "./providers";

const NOW = new Date("2026-10-21T00:00:00Z");
const NONCE = "nonce-1";
const REDIRECT = "https://api.test/api/v1/auth/sso/callback/x";

type Call = { url: string; init?: RequestInit };

/** 주소별로 미리 정한 응답을 주는 가짜 fetch. 호출 기록을 남긴다. */
function fakeFetch(routes: Record<string, { status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) throw new Error(`예상하지 못한 요청: ${url}`);
    const r = routes[key];
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

async function idToken(claims: Record<string, unknown>, issuer: string, audience: string) {
  const { privateKey } = await generateKeyPair("ES256");
  return new SignJWT({ nonce: NONCE, ...claims })
    .setProtectedHeader({ alg: "ES256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("sub-1")
    .setIssuedAt(Math.floor(NOW.getTime() / 1000))
    .setExpirationTime(Math.floor(NOW.getTime() / 1000) + 600)
    .sign(privateKey);
}

const deps = (fetch: typeof globalThis.fetch) => ({ fetch, now: () => NOW });

describe("Google", () => {
  const config = { clientId: "gid", clientSecret: "gsecret" };

  it("로그인 주소에는 최소 범위(openid)만 요청한다", () => {
    const p = createGoogleProvider(config, deps(fakeFetch({}).fetch));
    const url = new URL(p.authorizationUrl({ state: "s", nonce: NONCE, redirectUri: REDIRECT }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "gid",
      redirect_uri: REDIRECT,
      response_type: "code",
      scope: "openid",
      state: "s",
      nonce: NONCE,
    });
  });

  it("코드를 토큰으로 바꾸고 id_token 의 sub 를 돌려준다", async () => {
    const { fetch, calls } = fakeFetch({
      "https://oauth2.googleapis.com/token": { body: { id_token: await idToken({}, "https://accounts.google.com", "gid") } },
    });
    const profile = await createGoogleProvider(config, deps(fetch)).fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT });
    expect(profile).toEqual({ subject: "sub-1" });

    const sent = new URLSearchParams(String(calls[0].init?.body));
    expect(Object.fromEntries(sent)).toMatchObject({
      grant_type: "authorization_code",
      code: "c",
      client_id: "gid",
      client_secret: "gsecret",
      redirect_uri: REDIRECT,
    });
  });

  it("발급자, 대상, nonce, 만료가 맞지 않는 id_token 은 거절한다", async () => {
    async function attempt(token: string) {
      const { fetch } = fakeFetch({ "https://oauth2.googleapis.com/token": { body: { id_token: token } } });
      return createGoogleProvider(config, deps(fetch)).fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT });
    }
    await expect(attempt(await idToken({}, "https://evil.com", "gid"))).rejects.toThrow("발급자");
    await expect(attempt(await idToken({}, "https://accounts.google.com", "other-app"))).rejects.toThrow("대상");
    await expect(attempt(await idToken({ nonce: "different" }, "https://accounts.google.com", "gid"))).rejects.toThrow("nonce");
    await expect(attempt("not-a-jwt")).rejects.toThrow("해석");

    const expired = await new SignJWT({ nonce: NONCE })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("https://accounts.google.com")
      .setAudience("gid")
      .setSubject("s")
      .setExpirationTime(Math.floor(NOW.getTime() / 1000) - 10)
      .sign(new TextEncoder().encode("k".repeat(32)));
    await expect(attempt(expired)).rejects.toThrow("만료");
  });

  it("업체가 오류를 주면 오류 코드만 담은 메시지로 던진다 (본문·비밀은 넣지 않는다)", async () => {
    const { fetch } = fakeFetch({
      "https://oauth2.googleapis.com/token": {
        status: 400,
        body: { error: "invalid_grant", error_description: "Bad code gsecret-leak", client_secret: "gsecret" },
      },
    });
    const error = await createGoogleProvider(config, deps(fetch))
      .fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT })
      .catch((e: Error) => e);
    expect((error as Error).message).toBe("로그인 업체가 요청을 거절했습니다. (HTTP 400, invalid_grant)");
    expect((error as Error).message).not.toContain("gsecret");
  });

  it("네트워크 오류도 원인 문구 없이 던진다", async () => {
    const fetch = (async () => {
      throw new Error("connect ECONNREFUSED with client_secret=gsecret");
    }) as unknown as typeof globalThis.fetch;
    const error = await createGoogleProvider(config, deps(fetch))
      .fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT })
      .catch((e: Error) => e);
    expect((error as Error).message).toBe("로그인 업체에 연결하지 못했습니다.");
  });
});

describe("Apple", () => {
  async function config() {
    const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
    const pem = await exportPKCS8(privateKey);
    return { publicKey, config: { clientId: "com.example.web", teamId: "TEAM", keyId: "KEY", privateKey: pem } };
  }

  it("로그인 주소에는 scope 를 넣지 않는다 (이메일·이름을 받지 않는다)", async () => {
    const { config: c } = await config();
    const url = new URL(createAppleProvider(c, deps(fakeFetch({}).fetch)).authorizationUrl({ state: "s", nonce: NONCE, redirectUri: REDIRECT }));
    expect(url.origin + url.pathname).toBe("https://appleid.apple.com/auth/authorize");
    expect(url.searchParams.has("scope")).toBe(false);
    expect(url.searchParams.has("response_mode")).toBe(false);
  });

  it("client_secret 은 개발자 키로 서명한 ES256 JWT 다", async () => {
    const { config: c, publicKey } = await config();
    const { fetch, calls } = fakeFetch({
      "https://appleid.apple.com/auth/token": { body: { id_token: await idToken({}, "https://appleid.apple.com", c.clientId) } },
    });
    const profile = await createAppleProvider(c, deps(fetch)).fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT });
    expect(profile).toEqual({ subject: "sub-1" });

    const secret = new URLSearchParams(String(calls[0].init?.body)).get("client_secret")!;
    expect(decodeProtectedHeader(secret)).toMatchObject({ alg: "ES256", kid: "KEY" });
    const { payload } = await jwtVerify(secret, publicKey, {
      issuer: "TEAM",
      subject: c.clientId,
      audience: "https://appleid.apple.com",
      currentDate: NOW,
    });
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(600);
  });

  it("다른 앱 대상의 id_token 은 거절한다", async () => {
    const { config: c } = await config();
    const { fetch } = fakeFetch({
      "https://appleid.apple.com/auth/token": { body: { id_token: await idToken({}, "https://appleid.apple.com", "other") } },
    });
    await expect(
      createAppleProvider(c, deps(fetch)).fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT }),
    ).rejects.toThrow("대상");
  });

  it("잘못된 개인 키는 연결 전에 실패한다", async () => {
    const { fetch, calls } = fakeFetch({});
    const p = createAppleProvider({ clientId: "a", teamId: "t", keyId: "k", privateKey: "garbage" }, deps(fetch));
    await expect(p.fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT })).rejects.toBeDefined();
    expect(calls).toHaveLength(0);
  });

  it("secret JWT 내용에 개인 키가 들어가지 않는다", async () => {
    const { config: c } = await config();
    const { fetch, calls } = fakeFetch({
      "https://appleid.apple.com/auth/token": { body: { id_token: await idToken({}, "https://appleid.apple.com", c.clientId) } },
    });
    await createAppleProvider(c, deps(fetch)).fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT });
    const secret = new URLSearchParams(String(calls[0].init?.body)).get("client_secret")!;
    expect(JSON.stringify(decodeJwt(secret))).not.toContain("PRIVATE");
  });
});

describe("카카오", () => {
  it("토큰으로 사용자 정보를 읽고 숫자 id 를 문자열로 돌려준다", async () => {
    const { fetch, calls } = fakeFetch({
      "https://kauth.kakao.com/oauth/token": { body: { access_token: "AT" } },
      "https://kapi.kakao.com/v2/user/me": { body: { id: 123456789 } },
    });
    const p = createKakaoProvider({ clientId: "kid", clientSecret: null }, deps(fetch));
    expect(await p.fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT })).toEqual({ subject: "123456789" });

    const sent = new URLSearchParams(String(calls[0].init?.body));
    expect(sent.has("client_secret")).toBe(false);
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe("Bearer AT");
  });

  it("client secret 을 쓰도록 설정했으면 함께 보낸다", async () => {
    const { fetch, calls } = fakeFetch({
      "https://kauth.kakao.com/oauth/token": { body: { access_token: "AT" } },
      "https://kapi.kakao.com/v2/user/me": { body: { id: "x" } },
    });
    await createKakaoProvider({ clientId: "kid", clientSecret: "ksecret" }, deps(fetch)).fetchProfile({
      code: "c",
      state: "s",
      nonce: NONCE,
      redirectUri: REDIRECT,
    });
    expect(new URLSearchParams(String(calls[0].init?.body)).get("client_secret")).toBe("ksecret");
  });

  it("로그인 주소에 필요한 값이 들어간다", () => {
    const url = new URL(
      createKakaoProvider({ clientId: "kid", clientSecret: null }, deps(fakeFetch({}).fetch)).authorizationUrl({
        state: "s",
        nonce: NONCE,
        redirectUri: REDIRECT,
      }),
    );
    expect(url.origin + url.pathname).toBe("https://kauth.kakao.com/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "kid",
      redirect_uri: REDIRECT,
      response_type: "code",
      state: "s",
    });
  });

  it("사용자 정보에 id 가 없으면 실패한다", async () => {
    const { fetch } = fakeFetch({
      "https://kauth.kakao.com/oauth/token": { body: { access_token: "AT" } },
      "https://kapi.kakao.com/v2/user/me": { body: {} },
    });
    await expect(
      createKakaoProvider({ clientId: "k", clientSecret: null }, deps(fetch)).fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT }),
    ).rejects.toThrow("id");
  });
});

describe("네이버", () => {
  const config = { clientId: "nid", clientSecret: "nsecret" };

  it("토큰 요청에 state 를 함께 보내고 response.id 를 돌려준다", async () => {
    const { fetch, calls } = fakeFetch({
      "https://nid.naver.com/oauth2.0/token": { body: { access_token: "AT" } },
      "https://openapi.naver.com/v1/nid/me": { body: { resultcode: "00", response: { id: "naver-abc" } } },
    });
    const profile = await createNaverProvider(config, deps(fetch)).fetchProfile({ code: "c", state: "STATE", nonce: NONCE, redirectUri: REDIRECT });
    expect(profile).toEqual({ subject: "naver-abc" });
    const token = new URL(calls[0].url);
    expect(token.searchParams.get("state")).toBe("STATE");
    expect(token.searchParams.get("code")).toBe("c");
  });

  it("네이버는 실패도 HTTP 200 으로 주므로 error 필드를 보고 거절한다", async () => {
    const { fetch } = fakeFetch({
      "https://nid.naver.com/oauth2.0/token": { status: 200, body: { error: "invalid_request", error_description: "nsecret" } },
    });
    const error = await createNaverProvider(config, deps(fetch))
      .fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT })
      .catch((e: Error) => e);
    expect((error as Error).message).toBe("로그인 업체가 요청을 거절했습니다. (HTTP 200, invalid_request)");
  });

  it("프로필에 id 가 없으면 실패한다", async () => {
    const { fetch } = fakeFetch({
      "https://nid.naver.com/oauth2.0/token": { body: { access_token: "AT" } },
      "https://openapi.naver.com/v1/nid/me": { body: { resultcode: "00" } },
    });
    await expect(
      createNaverProvider(config, deps(fetch)).fetchProfile({ code: "c", state: "s", nonce: NONCE, redirectUri: REDIRECT }),
    ).rejects.toThrow("id");
  });
});

describe("createSsoProviders", () => {
  it("설정이 있는 업체만 만든다", () => {
    const d = deps(fakeFetch({}).fetch);
    expect(createSsoProviders({}, d)).toEqual({});
    const made = createSsoProviders({ google: { clientId: "g", clientSecret: "s" }, kakao: { clientId: "k", clientSecret: null } }, d);
    expect(Object.keys(made).sort()).toEqual(["google", "kakao"]);
    expect(made.google?.id).toBe("google");
  });
});
