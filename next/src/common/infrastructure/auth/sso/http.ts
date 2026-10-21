import { decodeJwt } from "jose";

export type FetchFn = typeof fetch;

export interface ProviderDeps {
  fetch: FetchFn;
  now: () => Date;
}

const TIMEOUT_MS = 8000;

/**
 * 로그인 업체에 요청하고 JSON 을 받는다. 실패하면 던진다.
 * 오류 문구에는 업체가 준 오류 **코드**(예: invalid_grant)만 넣고, 응답 본문이나 토큰은 넣지 않는다. (로그에 남기 때문)
 */
export async function requestJson(fetchFn: FetchFn, url: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetchFn(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new Error("로그인 업체에 연결하지 못했습니다.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`로그인 업체의 응답을 해석할 수 없습니다. (HTTP ${response.status})`);
  }
  const record = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

  const code = record && typeof record.error === "string" && /^[\w.-]{1,60}$/.test(record.error) ? record.error : null;
  if (!response.ok || !record || code) {
    throw new Error(`로그인 업체가 요청을 거절했습니다. (HTTP ${response.status}${code ? `, ${code}` : ""})`);
  }
  return record;
}

export function form(params: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(params).toString(),
  };
}

export function bearer(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } };
}

export function requireString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`로그인 업체의 응답에 ${what} 이 없습니다.`);
  return value;
}

/**
 * 토큰 엔드포인트에서 TLS 로 직접 받은 ID 토큰의 내용을 확인한다. (OIDC 는 이 경우 서명 검사를 생략해도 된다고 정한다)
 * 발급자, 대상(우리 앱), 만료, nonce 가 모두 맞아야 한다. 맞으면 사용자 고유 번호(sub)를 돌려준다.
 */
export function readIdToken(
  idToken: unknown,
  expected: { issuers: readonly string[]; audience: string; nonce: string; now: Date },
): string {
  const token = requireString(idToken, "id_token");
  let claims;
  try {
    claims = decodeJwt(token);
  } catch {
    throw new Error("id_token 을 해석할 수 없습니다.");
  }

  if (!claims.iss || !expected.issuers.includes(claims.iss)) throw new Error("id_token 의 발급자가 올바르지 않습니다.");
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (!audiences.includes(expected.audience)) throw new Error("id_token 의 대상이 이 앱이 아닙니다.");
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= expected.now.getTime()) throw new Error("id_token 이 만료되었습니다.");
  if (claims.nonce !== expected.nonce) throw new Error("id_token 의 nonce 가 일치하지 않습니다.");
  return requireString(claims.sub, "sub");
}
