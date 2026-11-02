import { assertOperator } from "@/common/presentation/api/operator";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { sourcesFromSyncQuery } from "@/features/finance/presentation/api/sync-query";
import { getFinanceContainer } from "@/features/finance/finance-container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = apiHandler(async (request) => {
  assertOperator(request);

  const ids = sourcesFromSyncQuery(new URL(request.url).searchParams);
  const results = await getFinanceContainer().syncSchemes.execute(ids.length > 0 ? ids : undefined);
  return respond({ status: 200, body: { results } });
});
