import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleSaveScheme, handleUnsaveScheme } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertFinanceEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleSaveScheme(userId, id, getFinanceContainer()));
});

export const DELETE = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertFinanceEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleUnsaveScheme(userId, id, getFinanceContainer()));
});
