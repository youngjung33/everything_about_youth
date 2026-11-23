import { authorizeOperator } from "@/common/presentation/api/operator";
import { ApiError } from "@/common/presentation/api/errors";
import { canAdmin } from "../domain/role";
import { adminJwtConfig, getAdminContainer } from "../admin-container";
import { getCommonContainer } from "@/common/infrastructure/container";
import { ADMIN_SESSION_COOKIE, parseAdminSessionCookie } from "./admin-session-cookie";
import { AdminSessionError } from "../application/admin-errors";

/**
 * 수집 트리거: 관리자 쿠키( sync_trigger ) 또는 기존 X-Operator-Token.
 * 운영에서 OPERATOR_TOKEN 만 쓰는 CLI 경로는 그대로 동작한다.
 */
export async function assertSyncOperator(request: Request, env: Record<string, string | undefined> = process.env): Promise<void> {
  const cookieHeader = request.headers.get("cookie");
  const token = cookieHeader?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1];
  if (token) {
    const { secret, issuer, audience } = adminJwtConfig();
    const payload = await parseAdminSessionCookie(token, secret, issuer, audience);
    if (payload) {
      try {
        const session = await getAdminContainer().verifySession.execute(
          payload.sid,
          getCommonContainer().clock.now().toISOString(),
        );
        if (canAdmin(session.role, "sync_trigger")) return;
      } catch (e) {
        if (!(e instanceof AdminSessionError)) throw e;
      }
    }
  }

  const decision = authorizeOperator(request.headers.get("x-operator-token"), env);
  if (decision === "disabled") throw new ApiError("OPERATOR_DISABLED");
  if (decision === "allowed") return;
  throw new ApiError("FORBIDDEN");
}