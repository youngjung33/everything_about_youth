import { getAuthService } from "@/common/infrastructure/auth/auth-container";
import { handleStartSession } from "@/common/presentation/api/auth";
import { apiHandler, respond } from "@/common/presentation/api/respond";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 앱이 처음 실행될 때 세션(JWT 쌍)을 받는다. 토큰 없이 부를 수 있는 입구. */
export const POST = apiHandler(async () => respond(await handleStartSession(getAuthService())));
