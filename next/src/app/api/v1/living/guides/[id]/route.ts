import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getLivingContainer } from "@/features/living/living-container";
import { handleGetGuide } from "@/features/living/presentation/api/handlers";
import { assertLivingEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertLivingEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetGuide(id, new URL(request.url).searchParams, getLivingContainer()));
});
