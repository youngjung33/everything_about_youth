import { getSso } from "@/common/infrastructure/auth/auth-container";
import { ssoStartBodySchema } from "@/common/presentation/api/schemas/auth-schemas";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseJsonBody } from "@/common/presentation/api/validate";
import { handleStartSso } from "@/common/presentation/api/sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 로그인을 시작한다. 앱이 브라우저로 열 로그인 주소를 돌려준다. */
export const POST = apiHandler(async (request) => {
  const body = await parseJsonBody(request, ssoStartBodySchema);
  const { service, config } = getSso();
  // 로그인 업체가 돌아올 서버 주소. 운영에서는 SSO_PUBLIC_BASE_URL 로 고정한다.
  const base = config.publicBaseUrl ?? new URL(request.url).origin;
  return respond(await handleStartSso(body, service, base));
});
