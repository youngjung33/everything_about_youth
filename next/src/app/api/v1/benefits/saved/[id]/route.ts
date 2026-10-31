import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleSaveProgram, handleUnsaveProgram } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertBenefitsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleSaveProgram(userId, id, getBenefitsContainer()));
});

export const DELETE = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertBenefitsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleUnsaveProgram(userId, id, getBenefitsContainer()));
});
