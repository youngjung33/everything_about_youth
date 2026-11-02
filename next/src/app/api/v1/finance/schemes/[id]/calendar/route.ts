import { apiHandler } from "@/common/presentation/api/respond";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleSchemeCalendar } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  await assertFinanceEnabled();
  const { id } = await ctx.params;
  return handleSchemeCalendar(id, getFinanceContainer());
});
