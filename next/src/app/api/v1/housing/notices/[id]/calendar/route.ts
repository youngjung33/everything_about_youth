import { apiHandler } from "@/common/presentation/api/respond";
import { getHousingContainer } from "@/features/housing/infrastructure/container";
import { handleNoticeCalendar } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/housing/notices/:id/calendar — 접수 마감일을 캘린더 앱이 여는 ICS */
export const GET = apiHandler(async (_request, ctx: RouteContext<"/api/v1/housing/notices/[id]/calendar">) => {
  await assertHousingEnabled();
  const { id } = await ctx.params;
  return handleNoticeCalendar(id, getHousingContainer());
});
