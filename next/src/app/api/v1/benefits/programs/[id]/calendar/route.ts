import { apiHandler } from "@/common/presentation/api/respond";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleProgramCalendar } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 마감일 Google 캘린더 링크. */
export const GET = apiHandler(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  await assertBenefitsEnabled();
  const { id } = await ctx.params;
  return handleProgramCalendar(id, getBenefitsContainer());
});


