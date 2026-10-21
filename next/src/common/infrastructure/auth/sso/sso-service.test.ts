import { describe, expect, it, vi } from "vitest";
import { AuthService } from "@/common/application/auth";
import { SsoError, sha256Base64Url, type SsoProvider, type SsoProviders } from "@/common/application/sso";
import { SsoService, TICKET_TTL_SEC } from "@/common/application/sso-service";
import { silentLogger, type Clock } from "@/common/application/system";
import { JoseTokenService } from "../jwt-token-service";
import { openSqlite, runMigrations } from "../../persistence/sqlite/client";
import { SqliteAuthClientStore } from "../../persistence/sqlite/sqlite-auth-client-store";
import { SqliteSsoTicketStore, SqliteUserStore } from "../../persistence/sqlite/sqlite-user-store";
import { JoseSsoStateCodec } from "./jose-sso-state-codec";

const APP_REDIRECT = "everythingaboutyouth://auth";
const VERIFIER = "v".repeat(50);
const SECRET = "test-secret-test-secret-test-secret-123";

function fakeProvider(id: "google" | "kakao", overrides: Partial<SsoProvider> = {}): SsoProvider {
  return {
    id,
    authorizationUrl: ({ state, nonce, redirectUri }) =>
      `https://login.test/${id}?state=${state}&nonce=${nonce}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    fetchProfile: async () => ({ subject: `${id}-user-1` }),
    ...overrides,
  };
}

/** 실제 JWT state, 실제 SQLite, 가짜 로그인 업체로 로그인 흐름 전체를 검증한다. */
function setup(providers: SsoProviders = { google: fakeProvider("google") }) {
  let now = new Date("2026-10-21T00:00:00Z");
  const clock: Clock = { now: () => now };
  const conn = openSqlite(":memory:");
  runMigrations(conn.db);

  const tokens = new JoseTokenService(
    { secret: SECRET, issuer: "iss", audience: "aud", accessTtlSec: 900, refreshTtlSec: 3600 },
    clock,
  );
  const clients = new SqliteAuthClientStore(conn.db);
  let sessionN = 0;
  const auth = new AuthService(tokens, clients, clock, () => `session-${++sessionN}`);
  let secretN = 0;
  let userN = 0;
  const sso = new SsoService({
    providers,
    state: new JoseSsoStateCodec(SECRET, "iss", clock),
    users: new SqliteUserStore(conn.db),
    tickets: new SqliteSsoTicketStore(conn.db),
    clients,
    auth,
    clock,
    logger: silentLogger,
    redirects: { allowed: [APP_REDIRECT], allowLocalhost: false },
    newId: () => `user-${++userN}`,
    newSecret: () => `secret-${++secretN}`,
  });
  return { sso, auth, tokens, clients, conn, advance: (sec: number) => (now = new Date(now.getTime() + sec * 1000)) };
}

async function startLogin(sso: SsoService, provider: string = "google") {
  const challenge = await sha256Base64Url(VERIFIER);
  const { authorizationUrl } = await sso.start({
    provider,
    redirectUri: APP_REDIRECT,
    codeChallenge: challenge,
    callbackBase: "https://api.test",
    callbackPath: (p) => `/api/v1/auth/sso/callback/${p}`,
  });
  const url = new URL(authorizationUrl);
  return { state: url.searchParams.get("state")!, nonce: url.searchParams.get("nonce")!, url };
}

function ticketOf(outcome: Awaited<ReturnType<SsoService["handleCallback"]>>): string {
  if (outcome.kind !== "redirect") throw new Error("redirect 가 아니다");
  return new URL(outcome.url).searchParams.get("ticket")!;
}

describe("SsoService.listProviders", () => {
  it("네 곳을 정해진 순서로 모두 주고, 설정된 곳만 enabled 다", () => {
    const { sso } = setup({ kakao: fakeProvider("kakao") });
    expect(sso.listProviders()).toEqual([
      { id: "google", name: "Google", enabled: false },
      { id: "apple", name: "Apple", enabled: false },
      { id: "naver", name: "네이버", enabled: false },
      { id: "kakao", name: "카카오", enabled: true },
    ]);
  });

  it("아무것도 설정되지 않으면 모두 비활성이다 (비회원 조회만 가능)", () => {
    expect(setup({}).sso.listProviders().every((p) => !p.enabled)).toBe(true);
  });
});

describe("SsoService.start", () => {
  it("업체의 로그인 주소를 만든다. 업체가 돌아올 주소는 서버 콜백이다", async () => {
    const { sso } = setup();
    const { url, state } = await startLogin(sso);
    expect(url.origin + url.pathname).toBe("https://login.test/google");
    expect(url.searchParams.get("redirect_uri")).toBe("https://api.test/api/v1/auth/sso/callback/google");
    expect(state.split(".")).toHaveLength(3); // 서명된 JWT
  });

  it("알 수 없는 업체, 잘못된 challenge, 허용되지 않은 돌아갈 주소는 거절한다", async () => {
    const { sso } = setup();
    const base = { callbackBase: "https://api.test", callbackPath: (p: string) => `/cb/${p}` };
    const challenge = await sha256Base64Url(VERIFIER);

    await expect(
      sso.start({ ...base, provider: "facebook", redirectUri: APP_REDIRECT, codeChallenge: challenge }),
    ).rejects.toMatchObject({ code: "invalid_request" });
    await expect(
      sso.start({ ...base, provider: "google", redirectUri: APP_REDIRECT, codeChallenge: "short" }),
    ).rejects.toMatchObject({ code: "invalid_request" });
    await expect(
      sso.start({ ...base, provider: "google", redirectUri: "https://evil.com/x", codeChallenge: challenge }),
    ).rejects.toMatchObject({ code: "invalid_redirect" });
    await expect(
      sso.start({ ...base, provider: "google", redirectUri: undefined, codeChallenge: challenge }),
    ).rejects.toMatchObject({ code: "invalid_redirect" });
  });

  it("설정되지 않은 업체는 provider_unavailable", async () => {
    const { sso } = setup({ google: fakeProvider("google") });
    await expect(startLogin(sso, "kakao")).rejects.toMatchObject({ code: "provider_unavailable" });
  });
});

describe("로그인 전체 흐름 (시작 → 콜백 → 교환)", () => {
  it("성공하면 앱 주소로 티켓이 돌아오고, 교환하면 회원 세션을 받는다", async () => {
    const fetchProfile = vi.fn(async () => ({ subject: "g-123" }));
    const { sso, tokens, clients } = setup({ google: fakeProvider("google", { fetchProfile }) });
    const { state, nonce } = await startLogin(sso);

    const outcome = await sso.handleCallback({ provider: "google", code: "auth-code", state, error: null });
    expect(outcome.kind).toBe("redirect");
    expect((outcome as { url: string }).url.startsWith(`${APP_REDIRECT}?ticket=`)).toBe(true);
    // 업체에는 인가 코드, state, nonce, 시작할 때 쓴 서버 콜백 주소를 그대로 넘긴다
    expect(fetchProfile).toHaveBeenCalledWith({
      code: "auth-code",
      state,
      nonce,
      redirectUri: "https://api.test/api/v1/auth/sso/callback/google",
    });

    const session = await sso.exchange({ ticket: ticketOf(outcome), verifier: VERIFIER });
    expect(session.member).toBe(true);
    const claims = await tokens.verify(session.accessToken, "access");
    expect((await clients.find(claims.sub))?.userId).toBe("user-1");
  });

  it("같은 계정으로 다시 로그인하면 같은 회원이고, 다른 계정이면 다른 회원이다", async () => {
    let subject = "g-1";
    const { sso, tokens, clients } = setup({
      google: fakeProvider("google", { fetchProfile: async () => ({ subject }) }),
    });

    async function login() {
      const { state } = await startLogin(sso);
      const outcome = await sso.handleCallback({ provider: "google", code: "c", state, error: null });
      const s = await sso.exchange({ ticket: ticketOf(outcome), verifier: VERIFIER });
      return (await clients.find((await tokens.verify(s.accessToken, "access")).sub))!.userId;
    }

    const first = await login();
    expect(await login()).toBe(first);
    subject = "g-2";
    expect(await login()).not.toBe(first);
  });

  it("티켓은 한 번만 쓸 수 있다", async () => {
    const { sso } = setup();
    const { state } = await startLogin(sso);
    const ticket = ticketOf(await sso.handleCallback({ provider: "google", code: "c", state, error: null }));

    await sso.exchange({ ticket, verifier: VERIFIER });
    await expect(sso.exchange({ ticket, verifier: VERIFIER })).rejects.toMatchObject({ code: "invalid_ticket" });
  });

  it("verifier 가 다르면 거절하고, 그 티켓은 이미 소모돼 다시 시도할 수 없다 (티켓을 가로채도 쓸 수 없다)", async () => {
    const { sso } = setup();
    const { state } = await startLogin(sso);
    const ticket = ticketOf(await sso.handleCallback({ provider: "google", code: "c", state, error: null }));

    await expect(sso.exchange({ ticket, verifier: "x".repeat(50) })).rejects.toMatchObject({
      code: "invalid_ticket",
    });
    await expect(sso.exchange({ ticket, verifier: VERIFIER })).rejects.toMatchObject({ code: "invalid_ticket" });
  });

  it("티켓은 만료되면 쓸 수 없다", async () => {
    const { sso, advance } = setup();
    const { state } = await startLogin(sso);
    const ticket = ticketOf(await sso.handleCallback({ provider: "google", code: "c", state, error: null }));

    advance(TICKET_TTL_SEC + 1);
    await expect(sso.exchange({ ticket, verifier: VERIFIER })).rejects.toMatchObject({ code: "invalid_ticket" });
  });

  it("모르는 티켓은 invalid_ticket, 형식이 이상한 입력은 invalid_request", async () => {
    const { sso } = setup();
    await expect(sso.exchange({ ticket: "nope", verifier: VERIFIER })).rejects.toMatchObject({
      code: "invalid_ticket",
    });
    for (const input of [
      { ticket: undefined, verifier: VERIFIER },
      { ticket: "", verifier: VERIFIER },
      { ticket: "t".repeat(201), verifier: VERIFIER },
      { ticket: "t", verifier: "short" },
      { ticket: "t", verifier: 5 },
    ]) {
      await expect(sso.exchange(input)).rejects.toMatchObject({ code: "invalid_request" });
    }
  });
});

describe("콜백 실패 처리 (브라우저가 보는 요청이라 JSON 이 아니라 앱으로 돌려보낸다)", () => {
  it("사용자가 로그인 창에서 취소하면 error=cancelled", async () => {
    const { sso } = setup();
    const { state } = await startLogin(sso);
    expect(await sso.handleCallback({ provider: "google", code: null, state, error: "access_denied" })).toEqual({
      kind: "redirect",
      url: `${APP_REDIRECT}?error=cancelled`,
    });
  });

  it("업체가 다른 오류를 주거나 코드가 없으면 error=failed", async () => {
    const { sso } = setup();
    const { state } = await startLogin(sso);
    expect(await sso.handleCallback({ provider: "google", code: null, state, error: "server_error" })).toMatchObject({
      url: `${APP_REDIRECT}?error=failed`,
    });
    expect(await sso.handleCallback({ provider: "google", code: null, state, error: null })).toMatchObject({
      url: `${APP_REDIRECT}?error=failed`,
    });
  });

  it("업체 확인이 실패하면 error=failed 이고 회원이 만들어지지 않는다", async () => {
    const { sso, conn } = setup({
      google: fakeProvider("google", {
        fetchProfile: async () => {
          throw new Error("로그인 업체가 요청을 거절했습니다. (HTTP 400, invalid_grant)");
        },
      }),
    });
    const { state } = await startLogin(sso);
    expect(await sso.handleCallback({ provider: "google", code: "bad", state, error: null })).toMatchObject({
      url: `${APP_REDIRECT}?error=failed`,
    });
    expect(conn.raw.prepare("select count(*) as n from users").get()).toEqual({ n: 0 });
  });

  it("위조되었거나 만료된 state, 없는 state, 다른 업체의 state 는 앱으로 보내지 않고 안내 페이지만 보인다", async () => {
    const { sso, advance } = setup({ google: fakeProvider("google"), kakao: fakeProvider("kakao") });
    const { state } = await startLogin(sso);

    for (const bad of [null, "", "garbage", `${state}x`]) {
      expect((await sso.handleCallback({ provider: "google", code: "c", state: bad, error: null })).kind).toBe("page");
    }
    // google 로 만든 state 를 kakao 콜백에 내밀 수 없다
    expect((await sso.handleCallback({ provider: "kakao", code: "c", state, error: null })).kind).toBe("page");

    advance(11 * 60);
    expect((await sso.handleCallback({ provider: "google", code: "c", state, error: null })).kind).toBe("page");
  });
});

describe("로그아웃과 회원 탈퇴", () => {
  async function loginAs(sso: SsoService, tokens: JoseTokenService) {
    const { state } = await startLogin(sso);
    const ticket = ticketOf(await sso.handleCallback({ provider: "google", code: "c", state, error: null }));
    const session = await sso.exchange({ ticket, verifier: VERIFIER });
    return { session, clientId: (await tokens.verify(session.accessToken, "access")).sub };
  }

  it("로그아웃하면 그 세션의 갱신이 거절된다", async () => {
    const { sso, auth, tokens } = setup();
    const { session, clientId } = await loginAs(sso, tokens);

    await sso.logout(clientId);
    await expect(auth.refresh(session.refreshToken)).rejects.toBeDefined();
  });

  it("회원 탈퇴하면 회원 정보가 지워지고 그 회원의 모든 세션이 폐기된다", async () => {
    const { sso, auth, tokens, conn } = setup();
    const a = await loginAs(sso, tokens);
    const b = await loginAs(sso, tokens); // 같은 회원의 다른 기기

    await sso.deleteAccount(a.clientId);

    expect(conn.raw.prepare("select count(*) as n from users").get()).toEqual({ n: 0 });
    expect(conn.raw.prepare("select count(*) as n from user_identities").get()).toEqual({ n: 0 });
    await expect(auth.refresh(a.session.refreshToken)).rejects.toBeDefined();
    await expect(auth.refresh(b.session.refreshToken)).rejects.toBeDefined();
  });

  it("탈퇴한 뒤 같은 계정으로 로그인하면 새 회원이 된다", async () => {
    const { sso, tokens, clients } = setup();
    const first = await loginAs(sso, tokens);
    const firstUser = (await clients.find(first.clientId))!.userId;
    await sso.deleteAccount(first.clientId);

    const again = await loginAs(sso, tokens);
    const secondUser = (await clients.find(again.clientId))!.userId;
    expect(secondUser).not.toBeNull();
    expect(secondUser).not.toBe(firstUser);
  });

  it("비회원 세션과 모르는 세션은 탈퇴할 수 없다", async () => {
    const { sso, auth, tokens } = setup();
    const guest = await auth.startSession();
    const guestId = (await tokens.verify(guest.accessToken, "access")).sub;

    await expect(sso.deleteAccount(guestId)).rejects.toBeInstanceOf(SsoError);
    await expect(sso.deleteAccount(guestId)).rejects.toMatchObject({ code: "login_required" });
    await expect(sso.deleteAccount("nobody")).rejects.toMatchObject({ code: "login_required" });
  });

  it("폐기된 세션으로는 탈퇴할 수 없다", async () => {
    const { sso, tokens } = setup();
    const { clientId } = await loginAs(sso, tokens);
    await sso.logout(clientId);
    await expect(sso.deleteAccount(clientId)).rejects.toMatchObject({ code: "login_required" });
  });
});
