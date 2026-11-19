import { getAuthService } from "@/common/infrastructure/auth/auth-container";
import { handleStartSession } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 앱이 처음 실행될 때 세션(JWT 쌍)을 받는다. 토큰 없이 부를 수 있는 입구. */
export const POST = apiHandler(async () => respond(await handleStartSession(getAuthService())));


