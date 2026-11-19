import { ApiError } from "@/common/presentation/api/errors";
import { apiHandler } from "@/common/presentation/api/respond";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/**
 * 없는 API 주소. 구체적인 라우트가 먼저 맞으므로 여기에는 어디에도 맞지 않은 주소만 온다.
 * 없는 주소도 HTML 404 가 아니라 통합 오류 템플릿(NOT_FOUND)으로 응답한다.
 */
const notFound = apiHandler(async () => {
  throw new ApiError("NOT_FOUND");
});

/** GET — 정의되지 않은 API 경로(NOT_FOUND). */
export const GET = notFound;
/** POST — 정의되지 않은 API 경로(NOT_FOUND). */
export const POST = notFound;
/** PUT — 정의되지 않은 API 경로(NOT_FOUND). */
export const PUT = notFound;
/** PATCH — 정의되지 않은 API 경로(NOT_FOUND). */
export const PATCH = notFound;
/** DELETE — 정의되지 않은 API 경로(NOT_FOUND). */
export const DELETE = notFound;


