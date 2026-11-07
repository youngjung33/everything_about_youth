import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleListSavedIds } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertJobsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSavedIds(userId, getJobsContainer()));
});
