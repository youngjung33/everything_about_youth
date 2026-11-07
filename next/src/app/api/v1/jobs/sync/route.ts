import { assertOperator } from "@/common/presentation/api/operator";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { sourcesFromSyncQuery } from "@/features/jobs/presentation/api/sync-query";
import { getJobsContainer } from "@/features/jobs/jobs-container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = apiHandler(async (request) => {
  assertOperator(request);

  const ids = sourcesFromSyncQuery(new URL(request.url).searchParams);
  const results = await getJobsContainer().syncPostings.execute(ids.length > 0 ? ids : undefined);
  return respond({ status: 200, body: { results } });
});
