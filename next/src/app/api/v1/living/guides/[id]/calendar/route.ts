import { apiHandler } from "@/common/presentation/api/respond";
import { getLivingContainer } from "@/features/living/living-container";
import { handleGuideCalendar } from "@/features/living/presentation/api/handlers";
import { assertLivingEnabled } from "../../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  await assertLivingEnabled();
  const { id } = await ctx.params;
  return handleGuideCalendar(id, getLivingContainer());
});
