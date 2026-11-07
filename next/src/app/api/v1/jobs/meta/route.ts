import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleGetMeta } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  await assertJobsEnabled();
  return respond(await handleGetMeta(getJobsContainer()));
});
