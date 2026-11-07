import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleSaveScheme, handleUnsaveScheme } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertJobsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleSaveScheme(userId, id, getJobsContainer()));
});

export const DELETE = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertJobsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const { id } = await ctx.params;
  return respond(await handleUnsaveScheme(userId, id, getJobsContainer()));
});
