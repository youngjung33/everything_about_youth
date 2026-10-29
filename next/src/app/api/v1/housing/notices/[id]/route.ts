import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleGetNotice } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 공고 상세 (앱용 JSON). '내 조건' 파라미터를 주면 자격 판정이 포함된다. */
export const GET = apiHandler(async (request, ctx: RouteContext<"/api/v1/housing/notices/[id]">) => {
  await assertHousingEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetNotice(id, new URL(request.url).searchParams, getHousingContainer()));
});
