import { getAdminContainer } from "@/features/admin/admin-container";
import { adminJwtConfig } from "@/features/admin/admin-container";
import { ADMIN_SESSION_COOKIE, parseAdminSessionCookie } from "@/features/admin/presentation/admin-session-cookie";
import { apiHandler, respond } from "@/common/presentation/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = apiHandler(async (request) => {
  const token = request.headers.get("cookie")?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1];
  const jwt = adminJwtConfig();
  const payload = await parseAdminSessionCookie(token, jwt.secret, jwt.issuer, jwt.audience);
  if (payload) await getAdminContainer().logout.execute(payload.sid);
  return respond({ status: 200, body: { ok: true } }, {
    "Set-Cookie": `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  });
});