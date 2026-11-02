import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleListSchemes } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async (request) => {
  await assertFinanceEnabled();
  return respond(await handleListSchemes(new URL(request.url).searchParams, getFinanceContainer()));
});
