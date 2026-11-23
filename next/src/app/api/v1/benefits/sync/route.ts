import { assertSyncOperator } from "@/features/admin/presentation/assert-sync-operator";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { sourcesFromSyncQuery } from "@/features/benefits/presentation/api/sync-query";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** POST — 청년 혜택 외부·크롤러 수집 트리거. */
export const POST = apiHandler(async (request) => {
  await assertSyncOperator(request);

  const ids = sourcesFromSyncQuery(new URL(request.url).searchParams);
  const results = await getBenefitsContainer().syncPrograms.execute(ids.length > 0 ? ids : undefined);
  return respond({ status: 200, body: { results } });
});


