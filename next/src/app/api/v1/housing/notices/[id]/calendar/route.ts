import { apiHandler } from "@/common/presentation/api/respond";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleNoticeCalendar } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET /api/v1/housing/notices/:id/calendar — 접수 마감일을 캘린더 앱이 여는 ICS */
export const GET = apiHandler(async (_request, ctx: RouteContext<"/api/v1/housing/notices/[id]/calendar">) => {
  await assertHousingEnabled();
  const { id } = await ctx.params;
  return handleNoticeCalendar(id, getHousingContainer());
});


