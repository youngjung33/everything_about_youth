import { requireMemberUserId } from "@/common/presentation/api/auth";
import { mergeSavedGuidesBodySchema } from "@/common/presentation/api/schemas/living-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getLivingContainer } from "@/features/living/living-container";
import { handleListSaved, handleMergeSaved } from "@/features/living/presentation/api/handlers";
import { assertLivingEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertLivingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSaved(userId, new URL(request.url).searchParams, getLivingContainer()));
});

export const PUT = apiHandler(async (request) => {
  await assertLivingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const body = await parseJsonBody(request, mergeSavedGuidesBodySchema);
  return respond(await handleMergeSaved(userId, body, getLivingContainer()));
});
