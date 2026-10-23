import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getHousingContainer } from "@/features/housing/infrastructure/container";
import { handleListSavedIds } from "@/features/housing/presentation/api/handlers";
import { assertHousingEnabled } from "../../guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/housing/saved/ids — 관심 공고 id 만. 목록의 하트 표시용 */
export const GET = apiHandler(async (request) => {
  await assertHousingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSavedIds(userId, getHousingContainer()));
});
