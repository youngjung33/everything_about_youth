import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleSaveScheme, handleUnsaveScheme } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** PUT — 저장 목록에서 항목 하나 갱신. */
export const PUT = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertFinanceEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleSaveScheme(userId, id, getFinanceContainer()));
});

/** DELETE — 저장 목록에서 항목 하나 삭제. */
export const DELETE = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertFinanceEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleUnsaveScheme(userId, id, getFinanceContainer()));
});


