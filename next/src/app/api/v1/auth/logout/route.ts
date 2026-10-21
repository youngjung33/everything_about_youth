import { getSso } from "@/common/infrastructure/auth/auth-container";
import { apiHandler, clientIdOf, respond } from "@/common/presentation/api/respond";
import { handleLogout } from "@/common/presentation/api/sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 로그아웃. 이 세션만 폐기한다. */
export const POST = apiHandler(async (request) => respond(await handleLogout(clientIdOf(request), getSso().service)));
