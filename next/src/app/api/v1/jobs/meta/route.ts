import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleGetMeta } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 일자리 필터·라벨 메타. */
export const GET = apiHandler(async () => {
  await assertJobsEnabled();
  return respond(await handleGetMeta(getJobsContainer()));
});


