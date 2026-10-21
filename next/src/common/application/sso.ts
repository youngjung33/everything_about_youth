/**
 * SSO(소셜 로그인) 규격. 자체 아이디/비밀번호 로그인은 없고, 아래 4곳의 로그인만 연다.
 *
 * 흐름 (서버가 4곳의 OAuth 를 대신 처리하고, 앱은 브라우저로 로그인한 뒤 일회용 티켓만 받아 간다)
 *
 *  1. 앱 → `POST /auth/sso/start { provider, redirectUri, codeChallenge }`   → 로그인 주소
 *  2. 앱이 브라우저로 그 주소를 연다 → 사용자가 Google/Apple/네이버/카카오에서 로그인
 *  3. 로그인 업체 → `GET /auth/sso/callback/<provider>?code&state` (서버)   → 서버가 사용자를 확인하고 일회용 티켓을 만든다
 *  4. 서버가 앱의 `redirectUri?ticket=...` 로 브라우저를 돌려보낸다
 *  5. 앱 → `POST /auth/sso/exchange { ticket, verifier }`                   → 회원 세션(토큰 쌍)
 *
 * PKCE: 티켓은 `codeChallenge`(앱이 만든 verifier 의 SHA-256)에 묶인다. 같은 주소 규칙(커스텀 스킴)을 쓰는
 * 다른 앱이 티켓을 가로채도 verifier 가 없어서 쓸 수 없다.
 */

export const SSO_PROVIDER_IDS = ["google", "apple", "naver", "kakao"] as const;
export type SsoProviderId = (typeof SSO_PROVIDER_IDS)[number];

/** 로그인 화면에 보이는 이름. 목록 순서가 화면 순서다. */
export const SSO_PROVIDER_LABELS: Record<SsoProviderId, string> = {
  google: "Google",
  apple: "Apple",
  naver: "네이버",
  kakao: "카카오",
};

export function isSsoProviderId(value: unknown): value is SsoProviderId {
  return typeof value === "string" && (SSO_PROVIDER_IDS as readonly string[]).includes(value);
}

/** 로그인 업체가 알려 준 사용자. 개인정보 최소 수집을 위해 업체가 정해 준 고유 번호만 쓴다. (이메일·이름은 받지 않는다) */
export interface SsoProfile {
  subject: string;
}

/** 로그인 업체 하나. 설정(키)이 있는 업체만 만들어져서 [SsoProviders] 에 들어간다. */
export interface SsoProvider {
  readonly id: SsoProviderId;
  /** 사용자가 로그인할 주소. `redirectUri` 는 업체가 로그인 뒤에 돌아올 서버 주소다. */
  authorizationUrl(input: { state: string; nonce: string; redirectUri: string }): string;
  /** 인가 코드를 업체와 교환해 사용자를 확인한다. 실패하면 던진다. */
  fetchProfile(input: { code: string; state: string; nonce: string; redirectUri: string }): Promise<SsoProfile>;
}

/** 쓸 수 있는(설정이 된) 업체만 들어 있다. 없는 업체는 로그인 화면에서 "준비 중"이다. */
export type SsoProviders = Partial<Record<SsoProviderId, SsoProvider>>;

/** 로그인을 시작할 때 서명해서 업체에 맡기고, 돌아올 때 되돌려받는 값. 서버는 따로 저장하지 않는다. */
export interface SsoState {
  provider: SsoProviderId;
  nonce: string;
  /** 로그인이 끝나면 브라우저를 돌려보낼 앱 주소 (허용 목록을 통과한 값) */
  appRedirect: string;
  /** 앱이 만든 PKCE challenge */
  challenge: string;
  /** 업체가 돌아올 서버 주소. 인가 코드를 교환할 때 똑같은 값을 보내야 한다. */
  callbackUri: string;
}

export interface SsoStateCodec {
  sign(state: SsoState): Promise<string>;
  /** 서명·만료를 검사한다. 실패하면 `SsoError("invalid_state")`. */
  verify(token: string): Promise<SsoState>;
}

export type SsoErrorCode =
  | "provider_unavailable"
  | "invalid_request"
  | "invalid_redirect"
  | "invalid_state"
  | "invalid_ticket"
  | "login_required";

export class SsoError extends Error {
  constructor(
    public readonly code: SsoErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SsoError";
  }
}

/** 회원(사용자). 로그인 업체의 계정 하나가 사용자 하나다. (업체 사이의 계정 합치기는 하지 않는다) */
export interface UserStore {
  /** 있으면 마지막 로그인 시각만 고치고, 없으면 만든다. */
  findOrCreate(provider: SsoProviderId, subject: string, at: string, newId: () => string): Promise<string>;
  /** 사용자와 그 로그인 정보를 지운다. */
  delete(userId: string): Promise<void>;
}

/** 로그인 업체에서 돌아온 직후 만드는 일회용 티켓. 한 번 쓰면 사라지고, 만료되면 쓸 수 없다. */
export interface SsoTicketStore {
  create(ticketHash: string, userId: string, challenge: string, expiresAt: string, now: string): Promise<void>;
  /** 한 번만 돌려준다. 없거나 만료됐으면 null. */
  consume(ticketHash: string, now: string): Promise<{ userId: string; challenge: string } | null>;
}

export interface RedirectRules {
  /** 정확히 일치해야 하는 주소 (예: `everythingaboutyouth://auth`, `https://app.example.com/auth.html`) */
  allowed: readonly string[];
  /** 개발 편의: `http://localhost:<아무 포트>/auth.html` 허용 */
  allowLocalhost: boolean;
}

/**
 * 로그인 뒤에 돌아갈 앱 주소를 허용 목록에서만 받는다. (아무 주소나 받으면 티켓이 다른 곳으로 새는 open redirect 가 된다)
 * 쿼리와 해시는 허용하지 않는다. 우리가 `?ticket=` 을 붙이기 때문이다.
 */
export function isAllowedRedirectUri(uri: string, rules: RedirectRules): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.search !== "" || parsed.hash !== "" || uri.includes("?") || uri.includes("#")) return false;
  if (parsed.username !== "" || parsed.password !== "") return false;

  const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  if (rules.allowed.includes(normalized)) return true;

  return (
    rules.allowLocalhost &&
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
    parsed.pathname === "/auth.html"
  );
}

// ── PKCE ────────────────────────────────────────────────────────────────

export const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 을 base64url 로. PKCE challenge 와 티켓 보관값에 쓴다. */
export async function sha256Base64Url(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return base64Url(new Uint8Array(digest));
}

/** 추측할 수 없는 일회용 값 (32바이트) */
export function randomToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}
