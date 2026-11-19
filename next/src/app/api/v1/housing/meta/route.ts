import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleGetMeta } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../guard";

// 서비스 켜짐 여부를 요청마다 확인해야 하므로 정적 캐시를 쓰지 않는다.
/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 필터 선택지와 한글 라벨 (앱용 JSON) */
export const GET = apiHandler(async () => {
  await assertHousingEnabled();
  return respond(await handleGetMeta(getHousingContainer()));
});


