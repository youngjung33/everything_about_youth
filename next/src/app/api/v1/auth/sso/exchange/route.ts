import { getSso } from "@/common/infrastructure/auth/auth-container";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { handleExchangeTicket } from "@/common/presentation/api/sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 로그인이 끝난 앱이 일회용 티켓을 회원 세션(토큰)으로 바꾼다. */
export const POST = apiHandler(async (request) => {
  const json: unknown = await request.json().catch(() => undefined);
  return respond(await handleExchangeTicket(json, getSso().service));
});
