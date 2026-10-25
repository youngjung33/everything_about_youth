import { isSsoProviderId, SsoError } from "@/common/application/sso";
import type { SsoProviderStatus, SsoService } from "@/common/application/sso-service";
import { ssoCallbackPath, toDto, type SessionDto } from "./auth";
import { ApiError } from "./errors";
import type { ApiResult } from "./respond";

/** 비즈니스 오류를 통합 오류 템플릿의 코드로 바꾼다. */
function toApiError(e: unknown): unknown {
  if (!(e instanceof SsoError)) return e;
  switch (e.code) {
    case "provider_unavailable":
      return new ApiError("SSO_PROVIDER_UNAVAILABLE");
    case "invalid_ticket":
      return new ApiError("SSO_TICKET_INVALID");
    case "login_required":
      return new ApiError("LOGIN_REQUIRED");
    default:
      return new ApiError("BAD_REQUEST");
  }
}

/** GET /api/v1/auth/providers — 로그인 화면용. 4곳 모두 주고, 지금 쓸 수 있는 곳만 enabled 다. */
export function handleListProviders(sso: SsoService): ApiResult<{ providers: SsoProviderStatus[] }> {
  return { status: 200, body: { providers: sso.listProviders() } };
}

/** POST /api/v1/auth/sso/start { provider, redirectUri, codeChallenge } → { authorizationUrl } */
export async function handleStartSso(
  raw: { provider: string; redirectUri: string; codeChallenge: string },
  sso: SsoService,
  callbackBase: string,
): Promise<ApiResult<{ authorizationUrl: string }>> {
  try {
    const result = await sso.start({
      provider: raw.provider,
      redirectUri: raw.redirectUri,
      codeChallenge: raw.codeChallenge,
      callbackBase,
      callbackPath: ssoCallbackPath,
    });
    return { status: 200, body: result };
  } catch (e) {
    throw toApiError(e);
  }
}

/** POST /api/v1/auth/sso/exchange { ticket, verifier } → 회원 세션(토큰 쌍) */
export async function handleExchangeTicket(
  raw: { ticket: string; verifier: string },
  sso: SsoService,
): Promise<ApiResult<SessionDto>> {
  try {
    return { status: 200, body: toDto(await sso.exchange({ ticket: raw.ticket, verifier: raw.verifier })) };
  } catch (e) {
    throw toApiError(e);
  }
}

function page(message: string, status: number): Response {
  const escaped = message.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>청년의 모든 것</title></head><body style="font-family:sans-serif;padding:32px;line-height:1.6"><h1 style="font-size:20px">로그인할 수 없습니다</h1><p>${escaped}</p></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

/**
 * GET /api/v1/auth/sso/callback/<provider>?code&state[&error]
 * 로그인 업체에서 돌아온 **브라우저**의 요청이다. JSON 이 아니라 앱 주소로 보내는 리다이렉트로 답한다.
 */
export async function handleSsoCallback(provider: string, params: URLSearchParams, sso: SsoService): Promise<Response> {
  if (!isSsoProviderId(provider)) return page("알 수 없는 로그인 방법입니다.", 404);

  const outcome = await sso.handleCallback({
    provider,
    code: params.get("code"),
    state: params.get("state"),
    error: params.get("error"),
  });
  if (outcome.kind === "page") return page(outcome.message, 400);

  return new Response(null, {
    status: 302,
    // 주소에 일회용 티켓이 있으므로 다른 곳으로 새지 않게 한다.
    headers: { Location: outcome.url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

/** POST /api/v1/auth/logout — 이 세션을 폐기한다. */
export async function handleLogout(clientId: string | null, sso: SsoService): Promise<ApiResult<{ ok: true }>> {
  if (!clientId) throw new ApiError("AUTH_REQUIRED");
  await sso.logout(clientId);
  return { status: 200, body: { ok: true } };
}

/** POST /api/v1/auth/account/delete — 회원 탈퇴. 로그인한 회원의 세션에서만 된다. */
export async function handleDeleteAccount(clientId: string | null, sso: SsoService): Promise<ApiResult<{ ok: true }>> {
  if (!clientId) throw new ApiError("AUTH_REQUIRED");
  try {
    await sso.deleteAccount(clientId);
  } catch (e) {
    throw toApiError(e);
  }
  return { status: 200, body: { ok: true } };
}
