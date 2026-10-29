import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleSaveNotice, handleUnsaveNotice } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PUT /api/v1/housing/saved/:id — 관심 공고로 저장 */
export const PUT = apiHandler(async (request, ctx: RouteContext<"/api/v1/housing/saved/[id]">) => {
  await assertHousingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleSaveNotice(userId, id, getHousingContainer()));
});

/** DELETE /api/v1/housing/saved/:id — 관심 공고에서 빼기 */
export const DELETE = apiHandler(async (request, ctx: RouteContext<"/api/v1/housing/saved/[id]">) => {
  await assertHousingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleUnsaveNotice(userId, id, getHousingContainer()));
});
