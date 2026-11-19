import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleGetNotice } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 공고 상세 (앱용 JSON). '내 조건' 파라미터를 주면 자격 판정이 포함된다. */
export const GET = apiHandler(async (request, ctx: RouteContext<"/api/v1/housing/notices/[id]">) => {
  await assertHousingEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetNotice(id, new URL(request.url).searchParams, getHousingContainer()));
});


