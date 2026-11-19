import { handleHealth } from "@/common/presentation/api/health";
import { apiHandler, respond } from "@/common/presentation/api/respond";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 생존·준비 상태. 로드밸런서·배포 스크립트가 부른다. */
export const GET = apiHandler(async () => respond(handleHealth()));


