import type { Clock } from "./system";

/** 토큰 종류. 액세스 토큰은 API 호출용, 리프레시 토큰은 액세스 토큰을 다시 받는 데만 쓴다. */
export type TokenUse = "access" | "refresh";

/** JWT payload 에 넣는 공통 클레임. */
export interface TokenClaims {
  /** 기기(설치) 식별자. 서버가 발급한다. */
  sub: string; // 기기(설치) 식별자. 서버가 발급한다
  use: TokenUse; // access | refresh
  jti: string; // 토큰 인스턴스 id(재사용 추적)
}

/** 발급 직후 클라이언트에 넘기는 토큰 한 덩어리. */
export interface IssuedToken {
  token: string; // JWT 문자열
  /** 만료까지 남은 초 */
  expiresIn: number; // 만료까지 남은 초
}

/** verify 실패 원인(만료 vs 서명·형식 오류). */
export class InvalidTokenError extends Error {
  constructor(public readonly reason: "expired" | "invalid", message?: string) {
    super(message ?? (reason === "expired" ? "토큰이 만료되었습니다." : "토큰이 올바르지 않습니다.")); // super
  }
}

/** JWT 발급/검증. 구현(jose)은 infrastructure 에 있고, 검증만 필요한 곳(proxy)은 verify 만 쓴다. */
export interface TokenService {
  issue(use: TokenUse, sub: string): Promise<IssuedToken>; // 토큰 발급
  /** 서명·발급자·대상·만료·종류를 모두 검사한다. 실패하면 [InvalidTokenError]. */
  verify(token: string, use: TokenUse): Promise<TokenClaims>; // 서명·발급자·대상·만료·종류를 모두 검사한다. 실패하면 [InvalidTokenError]
}

/** 저장소에 있는 세션(기기) 행. */
export interface AuthClient {
  id: string; // 세션(클라이언트) id — JWT sub
  revoked: boolean; // true 이면 refresh 거절
  /** SSO 로 로그인한 세션이면 그 회원의 id, 비회원이면 null */
  userId: string | null; // SSO 로 로그인한 세션이면 그 회원의 id, 비회원이면 null
}

/** 서버가 발급한 세션(기기) 식별자 저장소. 폐기(revoke)한 세션은 리프레시가 거절된다. */
export interface GuestSessionPruneOptions {
  /** last_seen_at 이 이보다 이전인 비회원 행을 삭제한다. */
  olderThanIso: string; // last_seen_at 이 이보다 이전인 비회원 행을 삭제한다
  /** 비회원 행이 이 수를 넘으면 가장 오래 안 쓴 행부터 삭제한다. */
  maxRows: number; // 비회원 행이 이 수를 넘으면 가장 오래 안 쓴 행부터 삭제한다
}

/** 세션 행 영속화(생성·조회·폐기·비회원 정리). */
export interface AuthClientStore {
  create(id: string, at: string, userId?: string): Promise<void>; // 행 생성
  find(id: string): Promise<AuthClient | null>; // 행 조회
  touch(id: string, at: string): Promise<void>; // 마지막 사용 시각 갱신
  revoke(id: string): Promise<boolean>; // 세션 폐기
  /** 한 회원의 모든 세션을 폐기한다. (회원 탈퇴) */
  revokeByUser(userId: string): Promise<number>; // 한 회원의 모든 세션을 폐기한다. (회원 탈퇴)
  /** 비회원 세션만 정리한다. 회원에 묶인 행은 삭제하지 않는다. */
  pruneGuestSessions(options: GuestSessionPruneOptions): Promise<number>; // 비회원 세션만 정리한다. 회원에 묶인 행은 삭제하지 않는다
}

/** startSession / refresh 응답 DTO(앱·웹 공통). */
export interface SessionTokens {
  tokenType: "Bearer"; // 토큰 타입
  accessToken: string; // 액세스 토큰
  /** 액세스 토큰 만료까지 남은 초 */
  accessExpiresIn: number; // 액세스 토큰 만료까지 남은 초
  refreshToken: string; // 리프레시 토큰
  refreshExpiresIn: number; // 리프레시 만료까지 초
  /** 로그인한 회원의 세션이면 true, 비회원이면 false. 앱이 "내 세션이 비회원으로 바뀌었는가"를 알아채는 데 쓴다. */
  member: boolean; // 로그인한 회원의 세션이면 true, 비회원이면 false. 앱이 "내 세션이 비회원으로 바뀌었는가"를 알아채는 데 쓴다
}

/** refresh 거절 등 클라이언트에 돌려줄 인증 오류 코드. */
export type AuthErrorCode = "invalid_refresh";

/** [AuthErrorCode] 를 담는 인증 도메인 오류. */
export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message); // super
  }
}

/**
 * 세션 발급/갱신.
 *
 * 세션은 두 가지다. 토큰의 `sub` 는 항상 서버가 만든 세션 id 이고, 회원이면 그 세션이 회원 id 에 묶여 있다.
 * - 비회원: [startSession]. 로그인 없이 시작하고 조회만 한다.
 * - 회원:   [startUserSession]. SSO 로 확인된 회원에게 새 세션을 준다. (확인은 `SsoService` 가 한다)
 * 토큰 검증과 갱신은 둘이 같다.
 */
export interface GuestSessionMaintenance {
  maxAgeDays: number; // 이 날짜보다 오래된 비회원 세션 삭제
  maxRows: number; // 비회원 행 상한(초과 시 LRU 삭제)
}

/** AuthService */
export class AuthService {
  constructor(
    private readonly tokens: TokenService,
    private readonly clients: AuthClientStore,
    private readonly clock: Clock,
    private readonly newId: () => string,
    private readonly guestSessions?: GuestSessionMaintenance,
  ) {}

  /** 비회원 세션 */
  async startSession(): Promise<SessionTokens> {
    await this.pruneGuestSessionsIfConfigured();
    const id = this.newId();
    await this.clients.create(id, this.now());
    return this.issuePair(id, false);
  }

  private async pruneGuestSessionsIfConfigured(): Promise<void> {
    const policy = this.guestSessions;
    if (!policy) return;
    const cutoff = new Date(this.clock.now());
    cutoff.setUTCDate(cutoff.getUTCDate() - policy.maxAgeDays);
    await this.clients.pruneGuestSessions({ olderThanIso: cutoff.toISOString(), maxRows: policy.maxRows });
  }

  /** 회원 세션. 호출하는 쪽이 SSO 로 회원을 확인한 뒤에만 불러야 한다. */
  async startUserSession(userId: string): Promise<SessionTokens> {
    const id = this.newId();
    await this.clients.create(id, this.now(), userId);
    return this.issuePair(id, true);
  }

  /** 리프레시 토큰으로 새 토큰 쌍을 받는다. 폐기됐거나 서버가 모르는 기기면 [AuthError]. */
  async refresh(refreshToken: string): Promise<SessionTokens> {
    const claims = await this.tokens.verify(refreshToken, "refresh");
    const client = await this.clients.find(claims.sub);
    if (!client || client.revoked) {
      throw new AuthError("invalid_refresh", "세션이 유효하지 않습니다. 다시 시작해 주세요.");
    }
    await this.clients.touch(client.id, this.now());
    return this.issuePair(client.id, client.userId !== null);
  }

  /** 기기를 폐기한다. 이미 받은 액세스 토큰은 만료(기본 15분)까지 유효하고, 이후 갱신이 거절된다. */
  revoke(id: string): Promise<boolean> {
    return this.clients.revoke(id);
  }

  private async issuePair(sub: string, member: boolean): Promise<SessionTokens> {
    const [access, refresh] = await Promise.all([this.tokens.issue("access", sub), this.tokens.issue("refresh", sub)]);
    return {
      tokenType: "Bearer",
      accessToken: access.token,
      accessExpiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
      member,
    };
  }

  private now(): string {
    return this.clock.now().toISOString();
  }
}


