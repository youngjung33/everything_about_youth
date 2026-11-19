import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getLivingContainer } from "@/features/living/living-container";
import { handleGetGuide } from "@/features/living/presentation/api/handlers";
import { assertLivingEnabled } from "../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 이사·생활 가이드 상세. */
export const GET = apiHandler(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await assertLivingEnabled();
  const { id } = await ctx.params;
  return respond(await handleGetGuide(id, new URL(request.url).searchParams, getLivingContainer()));
});


