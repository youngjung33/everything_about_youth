import { requireMemberUserId } from "@/common/presentation/api/auth";
import { mergeSavedPostingsBodySchema } from "@/common/presentation/api/schemas/jobs-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleListSaved, handleMergeSaved } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertJobsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSaved(userId, new URL(request.url).searchParams, getJobsContainer()));
});

export const PUT = apiHandler(async (request) => {
  await assertJobsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const body = await parseJsonBody(request, mergeSavedPostingsBodySchema);
  return respond(await handleMergeSaved(userId, body, getJobsContainer()));
});
