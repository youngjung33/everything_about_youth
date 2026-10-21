import type { AuthClientStore, AuthService, SessionTokens } from "./auth";
import {
  PKCE_CHALLENGE_PATTERN,
  PKCE_VERIFIER_PATTERN,
  SSO_PROVIDER_IDS,
  SSO_PROVIDER_LABELS,
  SsoError,
  isAllowedRedirectUri,
  isSsoProviderId,
  randomToken,
  sha256Base64Url,
  type RedirectRules,
  type SsoProviderId,
  type SsoProviders,
  type SsoStateCodec,
  type SsoTicketStore,
  type UserStore,
} from "./sso";
import type { Clock, Logger } from "./system";

export interface SsoProviderStatus {
  id: SsoProviderId;
  name: string;
  /** 설정이 되어 지금 쓸 수 있으면 true. 아니면 앱이 "준비 중"으로 비활성 표시한다. */
  enabled: boolean;
}

/** 로그인 업체에서 돌아온 브라우저를 어디로 보낼지 */
export type CallbackOutcome =
  | { kind: "redirect"; url: string }
  /** 돌려보낼 앱 주소를 알 수 없을 때 (state 가 없거나 위조/만료). 브라우저에 안내 문구만 보여준다. */
  | { kind: "page"; message: string };

/** 티켓이 유효한 시간 (로그인 업체에서 돌아온 뒤 앱이 교환하기까지) */
export const TICKET_TTL_SEC = 120;

export interface SsoDeps {
  providers: SsoProviders;
  state: SsoStateCodec;
  users: UserStore;
  tickets: SsoTicketStore;
  clients: AuthClientStore;
  auth: AuthService;
  clock: Clock;
  logger: Logger;
  redirects: RedirectRules;
  newId?: () => string;
  /** 추측할 수 없는 일회용 값을 만든다. (테스트에서 고정) */
  newSecret?: () => string;
}

/**
 * SSO 로그인 유스케이스. 개인정보는 로그인 업체의 고유 번호 외에 받지 않는다.
 * (이메일·이름이 필요해지면 `FieldCipher` 로 암호화해서 저장한다)
 */
export class SsoService {
  private readonly newId: () => string;
  private readonly newSecret: () => string;

  constructor(private readonly deps: SsoDeps) {
    this.newId = deps.newId ?? (() => crypto.randomUUID());
    this.newSecret = deps.newSecret ?? randomToken;
  }

  /** 로그인 화면용. 4곳 모두 돌려주고 쓸 수 있는 곳만 enabled 다. */
  listProviders(): SsoProviderStatus[] {
    return SSO_PROVIDER_IDS.map((id) => ({
      id,
      name: SSO_PROVIDER_LABELS[id],
      enabled: this.deps.providers[id] !== undefined,
    }));
  }

  /** 1단계: 로그인 주소를 만든다. `callbackBase` 는 로그인 업체가 돌아올 서버의 바깥 주소(origin)다. */
  async start(input: {
    provider: unknown;
    redirectUri: unknown;
    codeChallenge: unknown;
    callbackBase: string;
    callbackPath: (provider: SsoProviderId) => string;
  }): Promise<{ authorizationUrl: string }> {
    if (!isSsoProviderId(input.provider)) throw new SsoError("invalid_request", "알 수 없는 로그인 방법입니다.");
    if (typeof input.codeChallenge !== "string" || !PKCE_CHALLENGE_PATTERN.test(input.codeChallenge)) {
      throw new SsoError("invalid_request", "codeChallenge 가 올바르지 않습니다.");
    }
    if (typeof input.redirectUri !== "string" || !isAllowedRedirectUri(input.redirectUri, this.deps.redirects)) {
      throw new SsoError("invalid_redirect", "허용되지 않은 돌아갈 주소입니다.");
    }
    const provider = this.deps.providers[input.provider];
    if (!provider) throw new SsoError("provider_unavailable", "이 로그인 방법은 아직 사용할 수 없습니다.");

    const nonce = this.newSecret();
    const callbackUri = `${input.callbackBase}${input.callbackPath(provider.id)}`;
    const state = await this.deps.state.sign({
      provider: provider.id,
      nonce,
      appRedirect: input.redirectUri,
      challenge: input.codeChallenge,
      callbackUri,
    });
    return { authorizationUrl: provider.authorizationUrl({ state, nonce, redirectUri: callbackUri }) };
  }

  /**
   * 3~4단계: 로그인 업체에서 돌아왔다. 사용자를 확인하고 일회용 티켓을 만들어 앱 주소로 돌려보낸다.
   * 브라우저가 보는 요청이라 JSON 오류를 줄 수 없다. 실패는 앱 주소의 `?error=` 로 알린다.
   */
  async handleCallback(input: {
    provider: SsoProviderId;
    code: string | null;
    state: string | null;
    error: string | null;
  }): Promise<CallbackOutcome> {
    let state;
    try {
      if (!input.state) throw new SsoError("invalid_state", "state 가 없습니다.");
      state = await this.deps.state.verify(input.state);
      if (state.provider !== input.provider) throw new SsoError("invalid_state", "state 의 로그인 방법이 다릅니다.");
    } catch {
      return { kind: "page", message: "로그인 요청이 만료되었거나 올바르지 않습니다. 앱으로 돌아가 다시 시도해 주세요." };
    }

    const back = (params: Record<string, string>) => ({
      kind: "redirect" as const,
      url: `${state.appRedirect}?${new URLSearchParams(params).toString()}`,
    });

    // 사용자가 로그인 창에서 취소했다.
    if (input.error) return back({ error: input.error === "access_denied" ? "cancelled" : "failed" });
    if (!input.code) return back({ error: "failed" });

    const provider = this.deps.providers[input.provider];
    if (!provider) return back({ error: "failed" });

    try {
      const profile = await provider.fetchProfile({
        code: input.code,
        state: input.state!,
        nonce: state.nonce,
        redirectUri: state.callbackUri,
      });
      const now = this.deps.clock.now();
      const userId = await this.deps.users.findOrCreate(provider.id, profile.subject, now.toISOString(), this.newId);

      const ticket = this.newSecret();
      await this.deps.tickets.create(
        await sha256Base64Url(ticket),
        userId,
        state.challenge,
        new Date(now.getTime() + TICKET_TTL_SEC * 1000).toISOString(),
        now.toISOString(),
      );
      return back({ ticket });
    } catch (e) {
      // 업체의 응답이나 토큰은 로그에도 남기지 않는다. 종류만 남긴다.
      this.deps.logger.warn(`[sso] ${provider.id} 로그인 처리 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
      return back({ error: "failed" });
    }
  }

  /** 5단계: 앱이 티켓과 verifier 를 내면 회원 세션을 준다. 티켓은 한 번만 쓸 수 있다. */
  async exchange(input: { ticket: unknown; verifier: unknown }): Promise<SessionTokens> {
    if (typeof input.ticket !== "string" || input.ticket.length === 0 || input.ticket.length > 200) {
      throw new SsoError("invalid_request", "ticket 이 필요합니다.");
    }
    if (typeof input.verifier !== "string" || !PKCE_VERIFIER_PATTERN.test(input.verifier)) {
      throw new SsoError("invalid_request", "verifier 가 올바르지 않습니다.");
    }

    const found = await this.deps.tickets.consume(await sha256Base64Url(input.ticket), this.deps.clock.now().toISOString());
    // verifier 가 틀려도 티켓은 이미 소모됐다. 추측으로 여러 번 시도할 수 없다.
    if (!found || (await sha256Base64Url(input.verifier)) !== found.challenge) {
      throw new SsoError("invalid_ticket", "로그인 정보가 만료되었거나 올바르지 않습니다. 다시 로그인해 주세요.");
    }
    return this.deps.auth.startUserSession(found.userId);
  }

  /** 로그아웃: 이 세션을 폐기한다. 다른 기기의 세션에는 영향이 없다. */
  async logout(clientId: string): Promise<void> {
    await this.deps.auth.revoke(clientId);
  }

  /** 회원 탈퇴: 회원과 로그인 정보를 지우고 그 회원의 모든 세션을 폐기한다. 비회원 세션이면 거절한다. */
  async deleteAccount(clientId: string): Promise<void> {
    const client = await this.deps.clients.find(clientId);
    if (!client || client.revoked || client.userId === null) {
      throw new SsoError("login_required", "로그인한 회원만 사용할 수 있습니다.");
    }
    await this.deps.clients.revokeByUser(client.userId);
    await this.deps.users.delete(client.userId);
  }
}
