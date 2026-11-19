import { requireMemberUserId } from "@/common/presentation/api/auth";
import { mergeSavedPostingsBodySchema } from "@/common/presentation/api/schemas/jobs-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { getAuthClientStore } from "@/common/infrastructure/auth/auth-container";
import { getJobsContainer } from "@/features/jobs/jobs-container";
import { handleListSaved, handleMergeSaved } from "@/features/jobs/presentation/api/handlers";
import { assertJobsEnabled } from "../guard";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** GET — 저장한 일자리 목록 조회. */
export const GET = apiHandler(async (request) => {
  await assertJobsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  return respond(await handleListSaved(userId, new URL(request.url).searchParams, getJobsContainer()));
});

/** PUT — 저장 목록 일괄 병합. */
export const PUT = apiHandler(async (request) => {
  await assertJobsEnabled();
  const userId = await requireMemberUserId(request, getAuthClientStore());
  const body = await parseJsonBody(request, mergeSavedPostingsBodySchema);
  return respond(await handleMergeSaved(userId, body, getJobsContainer()));
});


