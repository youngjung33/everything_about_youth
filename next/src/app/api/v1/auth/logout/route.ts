import { getSso } from "@/common/infrastructure/auth/auth-container";
import { apiHandler, clientIdOf, respond } from "@/common/presentation/api/respond";
import { handleLogout } from "@/common/presentation/api/sso";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 로그아웃. 이 세션만 폐기한다. */
export const POST = apiHandler(async (request) => respond(await handleLogout(clientIdOf(request), getSso().service)));


