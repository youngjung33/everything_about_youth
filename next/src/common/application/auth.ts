import type { Clock } from "./system";

/** 토큰 종류. 액세스 토큰은 API 호출용, 리프레시 토큰은 액세스 토큰을 다시 받는 데만 쓴다. */
export type TokenUse = "access" | "refresh";

export interface TokenClaims {
  /** 기기(설치) 식별자. 서버가 발급한다. */
  sub: string;
  use: TokenUse;
  jti: string;
}

export interface IssuedToken {
  token: string;
  /** 만료까지 남은 초 */
  expiresIn: number;
}

export class InvalidTokenError extends Error {
  constructor(public readonly reason: "expired" | "invalid", message?: string) {
    super(message ?? (reason === "expired" ? "토큰이 만료되었습니다." : "토큰이 올바르지 않습니다."));
  }
}

/** JWT 발급/검증. 구현(jose)은 infrastructure 에 있고, 검증만 필요한 곳(proxy)은 verify 만 쓴다. */
export interface TokenService {
  issue(use: TokenUse, sub: string): Promise<IssuedToken>;
  /** 서명·발급자·대상·만료·종류를 모두 검사한다. 실패하면 [InvalidTokenError]. */
  verify(token: string, use: TokenUse): Promise<TokenClaims>;
}

export interface AuthClient {
  id: string;
  revoked: boolean;
}

/** 서버가 발급한 기기 식별자 저장소. 폐기(revoke)한 기기는 리프레시가 거절된다. */
export interface AuthClientStore {
  create(id: string, at: string): Promise<void>;
  find(id: string): Promise<AuthClient | null>;
  touch(id: string, at: string): Promise<void>;
  revoke(id: string): Promise<boolean>;
}

export interface SessionTokens {
  tokenType: "Bearer";
  accessToken: string;
  /** 액세스 토큰 만료까지 남은 초 */
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

export type AuthErrorCode = "invalid_refresh";

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
  }
}

/**
 * 세션 발급/갱신.
 *
 * 지금은 로그인이 없으므로 서버가 기기마다 식별자(sub)를 새로 만들어 토큰을 준다. (익명 식별)
 * 로그인(2차, Supabase Auth 등)이 생기면 [startSession] 만 "로그인 확인 후 발급"으로 바꾸고,
 * 토큰 검증과 앱의 토큰 처리는 그대로 쓴다.
 */
export class AuthService {
  constructor(
    private readonly tokens: TokenService,
    private readonly clients: AuthClientStore,
    private readonly clock: Clock,
    private readonly newId: () => string,
  ) {}

  async startSession(): Promise<SessionTokens> {
    const id = this.newId();
    await this.clients.create(id, this.now());
    return this.issuePair(id);
  }

  /** 리프레시 토큰으로 새 토큰 쌍을 받는다. 폐기됐거나 서버가 모르는 기기면 [AuthError]. */
  async refresh(refreshToken: string): Promise<SessionTokens> {
    const claims = await this.tokens.verify(refreshToken, "refresh");
    const client = await this.clients.find(claims.sub);
    if (!client || client.revoked) {
      throw new AuthError("invalid_refresh", "세션이 유효하지 않습니다. 다시 시작해 주세요.");
    }
    await this.clients.touch(client.id, this.now());
    return this.issuePair(client.id);
  }

  /** 기기를 폐기한다. 이미 받은 액세스 토큰은 만료(기본 15분)까지 유효하고, 이후 갱신이 거절된다. */
  revoke(id: string): Promise<boolean> {
    return this.clients.revoke(id);
  }

  private async issuePair(sub: string): Promise<SessionTokens> {
    const [access, refresh] = await Promise.all([this.tokens.issue("access", sub), this.tokens.issue("refresh", sub)]);
    return {
      tokenType: "Bearer",
      accessToken: access.token,
      accessExpiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
    };
  }

  private now(): string {
    return this.clock.now().toISOString();
  }
}
