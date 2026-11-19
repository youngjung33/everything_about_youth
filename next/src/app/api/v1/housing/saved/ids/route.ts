import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleListSavedIds } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET /api/v1/housing/saved/ids — 관심 공고 id 만. 목록의 하트 표시용 */
export const GET = apiHandler(async (request) => {
  await assertHousingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSavedIds(userId, getHousingContainer()));
});


