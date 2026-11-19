import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getBenefitsContainer } from "@/features/benefits/benefits-container";
import { handleListPrograms } from "@/features/benefits/presentation/api/handlers";
import { assertBenefitsEnabled } from "../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 청년 혜택 프로그램 검색·목록. */
export const GET = apiHandler(async (request) => {
  await assertBenefitsEnabled();
  return respond(await handleListPrograms(new URL(request.url).searchParams, getBenefitsContainer()));
});


