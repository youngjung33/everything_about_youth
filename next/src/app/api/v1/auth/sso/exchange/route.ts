import { getSso } from "@/common/infrastructure/auth/auth-container";
import { ssoExchangeBodySchema } from "@/common/presentation/api/schemas/auth-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { handleExchangeTicket } from "@/common/presentation/api/sso";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 로그인이 끝난 앱이 일회용 티켓을 회원 세션(토큰)으로 바꾼다. */
export const POST = apiHandler(async (request) => {
  const body = await parseJsonBody(request, ssoExchangeBodySchema);
  return respond(await handleExchangeTicket(body, getSso().service));
});


