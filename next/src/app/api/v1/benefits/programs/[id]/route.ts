import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleGetProgram } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertBenefitsEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetProgram(id, new URL(request.url).searchParams, getBenefitsContainer()));
});
