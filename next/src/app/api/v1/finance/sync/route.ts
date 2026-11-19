import { assertOperator } from "@/common/presentation/api/operator";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { sourcesFromSyncQuery } from "@/features/finance/presentation/api/sync-query";
import { getFinanceContainer } from "@/features/finance/finance-container";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** POST — 주거·자금 외부·크롤러 수집 트리거. */
export const POST = apiHandler(async (request) => {
  assertOperator(request);

  const ids = sourcesFromSyncQuery(new URL(request.url).searchParams);
  const results = await getFinanceContainer().syncSchemes.execute(ids.length > 0 ? ids : undefined);
  return respond({ status: 200, body: { results } });
});


