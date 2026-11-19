import { requireMemberUserId } from "@/common/presentation/api/auth";
import { mergeSavedBodySchema } from "@/common/presentation/api/schemas/housing-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getHousingContainer } from "@/features/housing/housing-container";
import { handleListSaved, handleMergeSaved } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET /api/v1/housing/saved — 로그인한 회원의 관심 공고 목록 */
export const GET = apiHandler(async (request) => {
  await assertHousingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSaved(userId, new URL(request.url).searchParams, getHousingContainer()));
});

/** PUT /api/v1/housing/saved { ids } — 비회원 기기에서 가져온 id 를 회원 목록에 합친다 */
export const PUT = apiHandler(async (request) => {
  await assertHousingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const body = await parseJsonBody(request, mergeSavedBodySchema);
  return respond(await handleMergeSaved(userId, body, getHousingContainer()));
});


