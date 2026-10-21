import { AuthError, InvalidTokenError, type AuthService, type SessionTokens, type TokenService } from "@/common/application/auth";
import { SSO_PROVIDER_IDS, type SsoProviderId } from "@/common/application/sso";
import { ApiError, type ErrorCode } from "./errors";
import type { ApiResult } from "./respond";
import { apiPath } from "./version";

/** 로그인 업체가 로그인 뒤에 돌아오는 서버 주소. 업체마다 하나씩 업체 콘솔에 등록한다. */
export function ssoCallbackPath(provider: SsoProviderId): string {
  return apiPath(`/auth/sso/callback/${provider}`);
}

/**
 * 세션을 얻는 입구(비회원 시작, 갱신, SSO 로그인). 토큰이 있을 수 없어서 토큰 없이 부를 수 있다.
 * 로그아웃과 회원 탈퇴는 여기에 없다. 세션이 있어야 하는 요청이다.
 */
export const AUTH_ENTRY_PATHS: readonly string[] = [
  apiPath("/auth/session"),
  apiPath("/auth/refresh"),
  apiPath("/auth/providers"),
  apiPath("/auth/sso/start"),
  apiPath("/auth/sso/exchange"),
  ...SSO_PROVIDER_IDS.map(ssoCallbackPath),
];

/** 앱이 가장 먼저 부르는 설정. 세션보다 먼저 확인할 수 있어야 해서 공개다. */
export const APP_CONFIG_PATH = apiPath("/app-config");

/**
 * 토큰 없이 부를 수 있는 API.
 *
 * `/api/v1/housing/sync` 는 여기에 두지 않았다. 앱용 API 가 아니라 운영자용 수집 트리거이고,
 * 운영에서는 ALLOW_WEB_SYNC 로 따로 막혀 있다. (README 의 "인증" 절 참고)
 */
export const PUBLIC_API_PATHS: readonly string[] = [...AUTH_ENTRY_PATHS, APP_CONFIG_PATH];

/** 앱이 쓰는 JWT 보호 대상이 아닌 운영자용 경로 */
export const OPERATOR_API_PATHS: readonly string[] = [apiPath("/housing/sync")];

export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

type AuthFailureCode = Extract<ErrorCode, "AUTH_REQUIRED" | "AUTH_TOKEN_EXPIRED" | "AUTH_TOKEN_INVALID">;

export type AuthorizationResult =
  | { ok: true; clientId: string | null }
  | { ok: false; code: AuthFailureCode; wwwAuthenticate: string };

function unauthorized(code: AuthFailureCode): AuthorizationResult {
  const detail = code === "AUTH_REQUIRED" ? "" : `, error="invalid_token"`;
  return { ok: false, code, wwwAuthenticate: `Bearer realm="api"${detail}` };
}

/**
 * 모든 `/api/v1/*` 요청의 입구 검사. gateway(proxy)가 이 함수 하나로 판단한다.
 * - OPTIONS(CORS 사전 요청)와 공개/운영자 경로는 통과
 * - 그 외에는 유효한 액세스 토큰(Bearer)이 있어야 하고, 없거나 만료/위조면 실패 코드를 돌려준다
 */
export async function authorizeApiRequest(
  req: { method: string; pathname: string; authorization: string | null },
  tokens: TokenService,
): Promise<AuthorizationResult> {
  if (req.method === "OPTIONS") return { ok: true, clientId: null };
  if (PUBLIC_API_PATHS.includes(req.pathname) || OPERATOR_API_PATHS.includes(req.pathname)) {
    return { ok: true, clientId: null };
  }

  const token = extractBearerToken(req.authorization);
  if (!token) return unauthorized("AUTH_REQUIRED");

  try {
    const claims = await tokens.verify(token, "access");
    return { ok: true, clientId: claims.sub };
  } catch (e) {
    if (e instanceof InvalidTokenError && e.reason === "expired") return unauthorized("AUTH_TOKEN_EXPIRED");
    return unauthorized("AUTH_TOKEN_INVALID");
  }
}

export interface SessionDto {
  tokenType: "Bearer";
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  member: boolean;
}

export function toDto(t: SessionTokens): SessionDto {
  return { ...t };
}

/** POST /api/v1/auth/session  — 처음 실행한 기기가 세션(토큰 쌍)을 받는다. */
export async function handleStartSession(auth: AuthService): Promise<ApiResult<SessionDto>> {
  return { status: 200, body: toDto(await auth.startSession()) };
}

/** POST /api/v1/auth/refresh  { refreshToken } — 액세스 토큰이 만료되면 새 토큰 쌍을 받는다. */
export async function handleRefresh(rawBody: unknown, auth: AuthService): Promise<ApiResult<SessionDto>> {
  const refreshToken =
    typeof rawBody === "object" && rawBody !== null && "refreshToken" in rawBody
      ? (rawBody as { refreshToken: unknown }).refreshToken
      : undefined;
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    throw new ApiError("BAD_REQUEST", { message: "refreshToken 이 필요합니다." });
  }
  try {
    return { status: 200, body: toDto(await auth.refresh(refreshToken)) };
  } catch (e) {
    // 만료/위조/폐기/알 수 없는 기기는 같은 응답으로 돌려준다. (앱은 새 세션을 시작하면 된다)
    if (e instanceof InvalidTokenError || e instanceof AuthError) throw new ApiError("AUTH_REFRESH_INVALID");
    throw e;
  }
}
