import { adminJwtConfig, getAdminContainer } from "@/features/admin/admin-container";
import { getCommonContainer } from "@/common/infrastructure/container";
import { adminCookieOptions, ADMIN_SESSION_COOKIE, signAdminSessionCookie } from "@/features/admin/presentation/admin-session-cookie";
import { mapAdminLoginError } from "@/features/admin/presentation/admin-auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

/** 관리자 로그인. HttpOnly 쿠키에 세션 JWT 를 심는다. */
export const POST = apiHandler(async (request) => {
  const container = getAdminContainer();
  await container.ensureBootstrap();
  const json = bodySchema.parse(await request.json());
  const common = getCommonContainer();
  const nowMs = common.clock.now().getTime();
  try {
    const result = await container.login.execute(json.loginId, json.password, common.clock.now().toISOString(), nowMs);
    const jwt = adminJwtConfig();
    const cookieValue = await signAdminSessionCookie(
      { sid: result.sessionId, loginId: result.loginId, role: result.role },
      jwt.secret,
      jwt.issuer,
      jwt.audience,
      result.expiresAt,
    );
    const secure = process.env.NODE_ENV === "production";
    const opts = adminCookieOptions(result.expiresAt, secure);
    return respond(
      { status: 200, body: { loginId: result.loginId, role: result.role } },
      {
        "Set-Cookie": `${ADMIN_SESSION_COOKIE}=${cookieValue}; HttpOnly; Path=/; SameSite=Lax${secure ? "; Secure" : ""}; Expires=${opts.expires.toUTCString()}`,
      },
    );
  } catch (e) {
    return mapAdminLoginError(e);
  }
});