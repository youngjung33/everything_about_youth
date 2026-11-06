import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getLivingContainer } from "@/features/living/living-container";
import { handleSaveGuide, handleUnsaveGuide } from "@/features/living/presentation/api/handlers";
import { assertLivingEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertLivingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleSaveGuide(userId, id, getLivingContainer()));
});

export const DELETE = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertLivingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleUnsaveGuide(userId, id, getLivingContainer()));
});
