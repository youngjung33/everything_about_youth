import { getSso } from "@/common/infrastructure/auth/auth-container";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { handleStartSso } from "@/common/presentation/api/sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 로그인을 시작한다. 앱이 브라우저로 열 로그인 주소를 돌려준다. */
export const POST = apiHandler(async (request) => {
  const json: unknown = await request.json().catch(() => undefined);
  const { service, config } = getSso();
  // 로그인 업체가 돌아올 서버 주소. 운영에서는 SSO_PUBLIC_BASE_URL 로 고정한다.
  const base = config.publicBaseUrl ?? new URL(request.url).origin;
  return respond(await handleStartSso(json, service, base));
});
