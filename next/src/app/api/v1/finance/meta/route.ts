import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleGetMeta } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  await assertFinanceEnabled();
  return respond(await handleGetMeta(getFinanceContainer()));
});
