import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleListPostings } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 일자리 채용 공고 검색·목록. */
export const GET = apiHandler(async (request) => {
  await assertJobsEnabled();
  return respond(await handleListPostings(new URL(request.url).searchParams, getJobsContainer()));
});


