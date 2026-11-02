import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleGetScheme } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertFinanceEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetScheme(id, new URL(request.url).searchParams, getFinanceContainer()));
});
