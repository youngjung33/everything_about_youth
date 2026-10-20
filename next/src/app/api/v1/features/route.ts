import { handleGetFeatures } from "@/common/presentation/api/features";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { getFeatureFlags } from "@/features/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 서비스 켜짐/꺼짐 (앱용 JSON). 운영 중 바꾼 값이 바로 반영되도록 캐시하지 않는다. */
export const GET = apiHandler(async () => respond(await handleGetFeatures(getFeatureFlags())));
