import { requireMemberUserId } from "@/common/presentation/api/auth";
import { mergeSavedProgramsBodySchema } from "@/common/presentation/api/schemas/benefits-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleListSaved, handleMergeSaved } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertBenefitsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSaved(userId, new URL(request.url).searchParams, getBenefitsContainer()));
});

export const PUT = apiHandler(async (request) => {
  await assertBenefitsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const body = await parseJsonBody(request, mergeSavedProgramsBodySchema);
  return respond(await handleMergeSaved(userId, body, getBenefitsContainer()));
});
