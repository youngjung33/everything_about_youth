import { getAuthService } from "@/common/infrastructure/auth/auth-container";
import { handleRefresh } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 액세스 토큰이 만료되면 리프레시 토큰으로 새 토큰 쌍을 받는다. */
export const POST = apiHandler(async (request) => {
  const json: unknown = await request.json().catch(() => undefined);
  return respond(await handleRefresh(json, getAuthService()));
});
