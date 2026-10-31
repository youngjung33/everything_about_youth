import { apiHandler } from "@/common/presentation/api/respond";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleProgramCalendar } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  await assertBenefitsEnabled();
  const { id } = await ctx.params;
  return handleProgramCalendar(id, getBenefitsContainer());
});
