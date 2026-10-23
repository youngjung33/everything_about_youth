import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getHousingContainer } from "@/features/housing/infrastructure/container";
import { handleListSaved, handleMergeSaved } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../guard";

export const dynamic = "force-dynamic";
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
  return respond(await handleMergeSaved(userId, await request.json(), getHousingContainer()));
});
