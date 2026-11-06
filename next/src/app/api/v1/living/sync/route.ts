import { assertOperator } from "@/common/presentation/api/operator";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { sourcesFromSyncQuery } from "@/features/living/presentation/api/sync-query";
import { getLivingContainer } from "@/features/living/living-container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = apiHandler(async (request) => {
  assertOperator(request);

  const ids = sourcesFromSyncQuery(new URL(request.url).searchParams);
  const results = await getLivingContainer().syncGuides.execute(ids.length > 0 ? ids : undefined);
  return respond({ status: 200, body: { results } });
});
