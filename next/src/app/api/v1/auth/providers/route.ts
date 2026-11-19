import { getSso } from "@/common/infrastructure/auth/auth-container";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { handleListProviders } from "@/common/presentation/api/sso";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 로그인 화면용. Google/Apple/네이버/카카오 모두 주고, 지금 쓸 수 있는(설정된) 곳만 enabled 다. */
export const GET = apiHandler(async () => respond(handleListProviders(getSso().service)));


