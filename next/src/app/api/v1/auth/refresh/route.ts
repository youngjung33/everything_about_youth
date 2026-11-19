import { getAuthService } from "@/common/infrastructure/auth/auth-container";
import { handleRefresh } from "@/common/presentation/api/auth";
import { refreshBodySchema } from "@/common/presentation/api/schemas/auth-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 액세스 토큰이 만료되면 리프레시 토큰으로 새 토큰 쌍을 받는다. */
export const POST = apiHandler(async (request) => {
  const body = await parseJsonBody(request, refreshBodySchema);
  return respond(await handleRefresh(body, getAuthService()));
});


