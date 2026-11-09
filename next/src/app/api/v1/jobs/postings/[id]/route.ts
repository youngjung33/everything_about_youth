import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleGetPosting } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertJobsEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetPosting(id, new URL(request.url).searchParams, getJobsContainer()));
});
