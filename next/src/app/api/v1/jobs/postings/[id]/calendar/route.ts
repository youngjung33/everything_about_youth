import { apiHandler } from "@/common/presentation/api/respond";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handlePostingCalendar } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 마감일 Google 캘린더 링크. */
export const GET = apiHandler(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  await assertJobsEnabled();
  const { id } = await ctx.params;
  return handlePostingCalendar(id, getJobsContainer());
});


