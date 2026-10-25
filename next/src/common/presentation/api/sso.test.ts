import { describe, expect, it } from "vitest";
import { SsoError } from "@/common/application/sso";
import type { SsoService } from "@/common/application/sso-service";
import { ApiError } from "./errors";
import {
  handleDeleteAccount,
  handleExchangeTicket,
  handleListProviders,
  handleLogout,
  handleSsoCallback,
  handleStartSso,
} from "./sso";

/** SsoService 의 필요한 부분만 흉내 낸다. 실제 흐름은 sso-service.test.ts 가 검증한다. */
function fakeSso(overrides: Partial<Record<keyof SsoService, unknown>> = {}) {
  return {
    listProviders: () => [{ id: "google", name: "Google", enabled: true }],
    start: async () => ({ authorizationUrl: "https://login.test/x" }),
    exchange: async () => ({ accessToken: "a", refreshToken: "r", accessExpiresAt: "2026-10-21T00:15:00Z", refreshExpiresAt: "2026-11-21T00:00:00Z", member: true }),
    handleCallback: async () => ({ kind: "redirect", url: "everythingaboutyouth://auth?ticket=t" }),
    logout: async () => undefined,
    deleteAccount: async () => undefined,
    ...overrides,
  } as unknown as SsoService;
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  const e = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  expect(e).toBeInstanceOf(ApiError);
  return e as ApiError;
}

describe("handleListProviders", () => {
  it("업체 목록을 그대로 준다", () => {
    expect(handleListProviders(fakeSso())).toEqual({
      status: 200,
      body: { providers: [{ id: "google", name: "Google", enabled: true }] },
    });
  });
});

describe("handleStartSso", () => {
  it("본문의 값을 서비스에 넘기고 인증 주소를 돌려준다", async () => {
    let received: unknown;
    const sso = fakeSso({
      start: async (input: unknown) => {
        received = input;
        return { authorizationUrl: "https://login.test/x" };
      },
    });
    const r = await handleStartSso({ provider: "kakao", redirectUri: "r", codeChallenge: "c" }, sso, "https://api.test");
    expect(r).toEqual({ status: 200, body: { authorizationUrl: "https://login.test/x" } });
    expect(received).toMatchObject({ provider: "kakao", redirectUri: "r", codeChallenge: "c", callbackBase: "https://api.test" });
    // 콜백 경로는 /api/v1 아래의 provider 별 주소다
    expect((received as { callbackPath: (p: string) => string }).callbackPath("kakao")).toBe("/api/v1/auth/sso/callback/kakao");
  });

  it("SsoError 를 통합 오류 코드로 바꾼다", async () => {
    const body = { provider: "google", redirectUri: "https://app/callback", codeChallenge: "c".repeat(43) };
    const cases: [ConstructorParameters<typeof SsoError>[0], string][] = [
      ["provider_unavailable", "SSO_PROVIDER_UNAVAILABLE"],
      ["invalid_request", "BAD_REQUEST"],
      ["invalid_redirect", "BAD_REQUEST"],
    ];
    for (const [code, expected] of cases) {
      const sso = fakeSso({
        start: async () => {
          throw new SsoError(code, "m");
        },
      });
      expect((await errorOf(handleStartSso(body, sso, "https://api.test"))).code).toBe(expected);
    }
  });

  it("예상하지 못한 오류는 그대로 올린다 (상위에서 500 으로 처리)", async () => {
    const body = { provider: "google", redirectUri: "https://app/callback", codeChallenge: "c".repeat(43) };
    const boom = new Error("boom");
    const sso = fakeSso({
      start: async () => {
        throw boom;
      },
    });
    await expect(handleStartSso(body, sso, "https://api.test")).rejects.toBe(boom);
  });
});

describe("handleExchangeTicket", () => {
  it("회원 세션을 DTO 로 돌려준다", async () => {
    const r = await handleExchangeTicket({ ticket: "t", verifier: "v" }, fakeSso());
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ accessToken: "a", refreshToken: "r", member: true });
  });

  it("티켓 오류는 SSO_TICKET_INVALID", async () => {
    const sso = fakeSso({
      exchange: async () => {
        throw new SsoError("invalid_ticket", "m");
      },
    });
    expect(
      (await errorOf(handleExchangeTicket({ ticket: "t", verifier: "v".repeat(43) }, sso))).code,
    ).toBe("SSO_TICKET_INVALID");
  });
});

describe("handleSsoCallback", () => {
  it("성공하면 앱 주소로 302, 티켓이 새지 않도록 캐시·리퍼러를 막는다", async () => {
    const res = await handleSsoCallback("google", new URLSearchParams({ code: "c", state: "s" }), fakeSso());
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("everythingaboutyouth://auth?ticket=t");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("쿼리 값을 서비스에 그대로 넘긴다", async () => {
    let received: unknown;
    const sso = fakeSso({
      handleCallback: async (input: unknown) => {
        received = input;
        return { kind: "redirect", url: "x://y" };
      },
    });
    await handleSsoCallback("naver", new URLSearchParams({ code: "c", state: "s", error: "access_denied" }), sso);
    expect(received).toEqual({ provider: "naver", code: "c", state: "s", error: "access_denied" });
    await handleSsoCallback("naver", new URLSearchParams(), sso);
    expect(received).toEqual({ provider: "naver", code: null, state: null, error: null });
  });

  it("앱으로 돌려보낼 수 없는 경우(state 불량)에는 안내 페이지 400", async () => {
    const sso = fakeSso({ handleCallback: async () => ({ kind: "page", message: "만료되었습니다." }) });
    const res = await handleSsoCallback("google", new URLSearchParams(), sso);
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("만료되었습니다.");
  });

  it("안내 페이지에는 HTML 이 이스케이프된다", async () => {
    const sso = fakeSso({ handleCallback: async () => ({ kind: "page", message: '<script>alert("x")</script>' }) });
    const html = await (await handleSsoCallback("google", new URLSearchParams(), sso)).text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&#60;script&#62;");
  });

  it("알 수 없는 업체는 서비스를 부르지 않고 404 페이지", async () => {
    let called = false;
    const sso = fakeSso({
      handleCallback: async () => {
        called = true;
        return { kind: "redirect", url: "x://y" };
      },
    });
    const res = await handleSsoCallback("facebook", new URLSearchParams(), sso);
    expect(res.status).toBe(404);
    expect(called).toBe(false);
  });
});

describe("handleLogout / handleDeleteAccount", () => {
  it("세션 id 가 없으면 AUTH_REQUIRED", async () => {
    expect((await errorOf(handleLogout(null, fakeSso()))).code).toBe("AUTH_REQUIRED");
    expect((await errorOf(handleDeleteAccount(null, fakeSso()))).code).toBe("AUTH_REQUIRED");
  });

  it("로그아웃은 세션을 폐기한다", async () => {
    let revoked: string | undefined;
    const sso = fakeSso({
      logout: async (id: string) => {
        revoked = id;
      },
    });
    expect(await handleLogout("s1", sso)).toEqual({ status: 200, body: { ok: true } });
    expect(revoked).toBe("s1");
  });

  it("비회원이 탈퇴하려 하면 LOGIN_REQUIRED", async () => {
    const sso = fakeSso({
      deleteAccount: async () => {
        throw new SsoError("login_required", "m");
      },
    });
    expect((await errorOf(handleDeleteAccount("guest", sso))).code).toBe("LOGIN_REQUIRED");
  });

  it("회원 탈퇴 성공", async () => {
    expect(await handleDeleteAccount("s1", fakeSso())).toEqual({ status: 200, body: { ok: true } });
  });
});
