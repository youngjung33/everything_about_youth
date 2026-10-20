import { ApiError } from "@/common/presentation/api/errors";
import { apiHandler } from "@/common/presentation/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 없는 API 주소. 구체적인 라우트가 먼저 맞으므로 여기에는 어디에도 맞지 않은 주소만 온다.
 * 없는 주소도 HTML 404 가 아니라 통합 오류 템플릿(NOT_FOUND)으로 응답한다.
 */
const notFound = apiHandler(async () => {
  throw new ApiError("NOT_FOUND");
});

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
