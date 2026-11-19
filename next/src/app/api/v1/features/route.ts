import { handleGetFeatures } from "@/common/presentation/api/features";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getFeatureFlags } from "@/features/registry";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/** 서비스 켜짐/꺼짐 (앱용 JSON). 운영 중 바꾼 값이 바로 반영되도록 캐시하지 않는다. */
export const GET = apiHandler(async () => respond(await handleGetFeatures(getFeatureFlags())));


