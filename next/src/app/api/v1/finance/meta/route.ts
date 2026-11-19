import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getFinanceContainer } from "@/features/finance/finance-container";
import { handleGetMeta } from "@/features/finance/presentation/api/handlers";
import { assertFinanceEnabled } from "../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 주거·자금 필터·라벨 메타. */
export const GET = apiHandler(async () => {
  await assertFinanceEnabled();
  return respond(await handleGetMeta(getFinanceContainer()));
});


