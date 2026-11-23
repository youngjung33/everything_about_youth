import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "../domain/role";

export const ADMIN_SESSION_COOKIE = "eay_admin_session";
const ADMIN_JWT_USE = "admin";

export interface AdminCookiePayload {
  sid: string; // session id
  loginId: string; // login id
  role: AdminRole; // role
}

/** 관리자 세션 JWT (쿠키 값). */
export async function signAdminSessionCookie(
  payload: AdminCookiePayload,
  secret: Uint8Array,
  issuer: string,
  audience: string,
  expiresAtIso: string,
): Promise<string> {
  const exp = Math.floor(new Date(expiresAtIso).getTime() / 1000);
  return new SignJWT({ loginId: payload.loginId, role: payload.role, use: ADMIN_JWT_USE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sid)
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(exp)
    .sign(secret);
}

/** 쿠키 JWT 파싱. 실패 시 null */
export async function parseAdminSessionCookie(
  token: string | undefined,
  secret: Uint8Array,
  issuer: string,
  audience: string,
): Promise<AdminCookiePayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer, audience });
    if (payload.use !== ADMIN_JWT_USE || typeof payload.sub !== "string") return null;
    if (typeof payload.loginId !== "string" || typeof payload.role !== "string") return null;
    return { sid: payload.sub, loginId: payload.loginId, role: payload.role as AdminRole };
  } catch {
    return null;
  }
}

export function adminCookieOptions(expiresAtIso: string, secure: boolean): {
  httpOnly: true;
  sameSite: "lax";
  path: string;
  expires: Date;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAtIso),
    secure,
  };
}