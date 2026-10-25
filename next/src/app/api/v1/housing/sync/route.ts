import { assertOperator } from "@/common/presentation/api/operator";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { sourcesFromSyncQuery } from "@/features/housing/presentation/api/sync-query";
import { getHousingContainer } from "@/features/housing/infrastructure/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 수동 수집 트리거(운영자용). 앱 사용자의 JWT 와는 별개로 `X-Operator-Token` 헤더가 `OPERATOR_TOKEN` 과 같아야 한다.
 * 운영에서 `OPERATOR_TOKEN` 이 없으면 이 API 는 꺼져 있다. 평소 수집은 `HOUSING_SYNC_INTERVAL_MINUTES` 자동 수집이 한다.
 */
export const POST = apiHandler(async (request) => {
  assertOperator(request);

  const ids = sourcesFromSyncQuery(new URL(request.url).searchParams);
  const results = await getHousingContainer().syncNotices.execute(ids.length > 0 ? ids : undefined);
  return respond({ status: 200, body: { results } });
});
