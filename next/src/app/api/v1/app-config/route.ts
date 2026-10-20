import { loadAppPolicy } from "@/common/infrastructure/config/app-policy-config";
import { handleGetAppConfig } from "@/common/presentation/api/app-config";
import { apiHandler, respond } from "@/common/presentation/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 앱이 시작할 때 가장 먼저 부르는 설정(강제 업데이트 여부). 토큰 없이 부를 수 있다. */
export const GET = apiHandler(async (request) =>
  respond(
    handleGetAppConfig(
      { version: request.headers.get("x-app-version"), platform: request.headers.get("x-app-platform") },
      loadAppPolicy(),
    ),
  ),
);
