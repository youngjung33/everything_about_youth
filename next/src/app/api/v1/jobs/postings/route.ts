import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleListPostings } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertJobsEnabled();
  return respond(await handleListPostings(new URL(request.url).searchParams, getJobsContainer()));
});
