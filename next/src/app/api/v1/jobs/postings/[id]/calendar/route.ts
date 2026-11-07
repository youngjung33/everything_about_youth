import { apiHandler } from "@/common/presentation/api/respond";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleSchemeCalendar } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  await assertJobsEnabled();
  const { id } = await ctx.params;
  return handleSchemeCalendar(id, getJobsContainer());
});
