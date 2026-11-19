import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleListNotices } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 공고 목록 (앱용 JSON). 파라미터는 웹 목록 화면과 동일 + pageSize */
export const GET = apiHandler(async (request) => {
  await assertHousingEnabled();
  return respond(await handleListNotices(new URL(request.url).searchParams, getHousingContainer()));
});


