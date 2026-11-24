import { cookies } from "next/headers";
import { ApiError } from "@/common/presentation/api/errors";
import { canAdminPermission, type AdminAction } from "../domain/role";
import type { AdminSyncSection } from "../domain/permissions";
import { adminJwtConfig, getAdminContainer } from "../admin-container";
import { getCommonContainer } from "@/common/infrastructure/container";
import type { AdminSessionView } from "../application/use-cases/verify-admin-session";
import { AdminAccountError, AdminAuthError, AdminSessionError } from "../application/admin-errors";
import { ADMIN_SESSION_COOKIE, parseAdminSessionCookie } from "./admin-session-cookie";

async function cookiePayload(): Promise<{ sid: string; loginId: string; role: AdminRole } | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const { secret, issuer, audience } = adminJwtConfig();
  return parseAdminSessionCookie(token, secret, issuer, audience);
}

/** RSC·서버 액션: 관리자 세션( DB 검증 포함). 없으면 null */
export async function getVerifiedAdminSession(): Promise<AdminSessionView | null> {
  const payload = await cookiePayload();
  if (!payload) return null;
  const container = getAdminContainer();
  try {
    return await container.verifySession.execute(payload.sid, getCommonContainer().clock.now().toISOString());
  } catch {
    return null;
  }
}

/** API: 관리자 세션·권한 확인. 실패 시 ApiError */
export async function requireAdminApi(
  request: Request,
  action: AdminAction,
  ctx?: { section?: AdminSyncSection },
): Promise<AdminSessionView> {
  const token = request.headers.get("cookie")?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1];
  const { secret, issuer, audience } = adminJwtConfig();
  const payload = await parseAdminSessionCookie(token, secret, issuer, audience);
  if (!payload) throw new ApiError("ADMIN_AUTH_REQUIRED");
  try {
    const session = await getAdminContainer().verifySession.execute(
      payload.sid,
      getCommonContainer().clock.now().toISOString(),
    );
    if (!canAdminPermission(session.permissions, action, ctx)) throw new ApiError("FORBIDDEN");
    return session;
  } catch (e) {
    if (e instanceof AdminSessionError) throw new ApiError("ADMIN_AUTH_REQUIRED");
    throw e;
  }
}

/** 로그인 API 오류 매핑 */
export function mapAdminLoginError(e: unknown): never {
  if (e instanceof AdminAuthError) throw new ApiError("ADMIN_INVALID_CREDENTIALS");
  throw e;
}

export function mapAdminAccountError(e: unknown): never {
  if (e instanceof AdminAccountError) {
    switch (e.reason) {
      case "exists":
        throw new ApiError("ADMIN_ACCOUNT_EXISTS");
      case "weak_password":
        throw new ApiError("ADMIN_WEAK_PASSWORD");
      case "last_super":
        throw new ApiError("ADMIN_LAST_SUPER");
      case "root_protected":
        throw new ApiError("ADMIN_ROOT_PROTECTED");
      case "permission_exceeds":
        throw new ApiError("ADMIN_PERMISSION_EXCEEDS");
      case "not_found":
        throw new ApiError("NOT_FOUND");
      default:
        throw new ApiError("FORBIDDEN");
    }
  }
  throw e;
}
