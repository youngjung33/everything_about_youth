import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleSaveProgram, handleUnsaveProgram } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** PUT — 저장 목록에서 항목 하나 갱신. */
export const PUT = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertBenefitsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleSaveProgram(userId, id, getBenefitsContainer()));
});

/** DELETE — 저장 목록에서 항목 하나 삭제. */
export const DELETE = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertBenefitsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleUnsaveProgram(userId, id, getBenefitsContainer()));
});


