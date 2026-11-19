import { requireMemberUserId } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getLivingContainer } from "@/features/living/living-container";
import { handleListSavedIds } from "@/features/living/presentation/api/handlers";
import { assertLivingEnabled } from "../../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 저장한 항목 id 목록. */
export const GET = apiHandler(async (request) => {
  await assertLivingEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSavedIds(userId, getLivingContainer()));
});


