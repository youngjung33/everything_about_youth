import { requireMemberUserId } from "@/common/presentation/api/auth";
import { mergeSavedSchemesBodySchema } from "@/common/presentation/api/schemas/finance-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleListSaved, handleMergeSaved } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertFinanceEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSaved(userId, new URL(request.url).searchParams, getFinanceContainer()));
});

export const PUT = apiHandler(async (request) => {
  await assertFinanceEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const body = await parseJsonBody(request, mergeSavedSchemesBodySchema);
  return respond(await handleMergeSaved(userId, body, getFinanceContainer()));
});
