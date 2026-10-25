import { handleHealth } from "@/common/presentation/api/health";
import { apiHandler, respond } from "@/common/presentation/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 생존·준비 상태. 로드밸런서·배포 스크립트가 부른다. */
export const GET = apiHandler(async () => respond(handleHealth()));
