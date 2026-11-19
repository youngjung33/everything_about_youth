import { getSso } from "@/common/infrastructure/auth/auth-container";
import { apiHandler } from "@/common/presentation/api/respond";
import { handleSsoCallback } from "@/common/presentation/api/sso";

/** 요청마다 최신 데이터·기능 플래그를 반영한다(정적 캐시 없음). */
export const dynamic = "force-dynamic";
/** SQLite 등 네이티브 모듈을 쓰므로 Node.js 런타임. */
export const runtime = "nodejs";

/**
 * 로그인 업체가 로그인 뒤에 브라우저를 돌려보내는 주소. (업체 콘솔에 이 주소를 등록한다)
 * 사용자를 확인하고 앱의 주소로 다시 보낸다.
 */
export const GET = apiHandler(async (request, ctx: RouteContext<"/api/v1/auth/sso/callback/[provider]">) => {
  const { provider } = await ctx.params;
  return handleSsoCallback(provider, new URL(request.url).searchParams, getSso().service);
});


