import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleListSavedIds } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertFinanceEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSavedIds(userId, getFinanceContainer()));
});
