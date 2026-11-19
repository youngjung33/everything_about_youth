import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleGetScheme } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 주거·자금 제도 상세. */
export const GET = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertFinanceEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetScheme(id, new URL(request.url).searchParams, getFinanceContainer()));
});


