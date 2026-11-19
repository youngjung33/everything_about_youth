import { loadAppPolicy } from "@/common/infrastructure/config/app-policy-config";
import { handleGetAppConfig } from "@/common/presentation/api/app-config";
import { apiHandler, respond } from "@/common/presentation/api/respond";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
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


