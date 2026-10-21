import { getSso } from "@/common/infrastructure/auth/auth-container";
import { apiHandler, clientIdOf, respond } from "@/common/presentation/api/respond";
import { handleDeleteAccount } from "@/common/presentation/api/sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 회원 탈퇴. 로그인한 회원의 세션에서만 된다. 회원 정보를 지우고 그 회원의 모든 세션을 폐기한다. */
export const POST = apiHandler(async (request) =>
  respond(await handleDeleteAccount(clientIdOf(request), getSso().service)),
);
