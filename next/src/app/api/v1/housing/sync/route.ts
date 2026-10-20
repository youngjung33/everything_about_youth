import { ApiError } from "@/common/presentation/api/errors";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseSourceList } from "@/features/housing/infrastructure/config";
import { getHousingContainer } from "@/features/housing/infrastructure/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 수동 수집 트리거 (개인용). 운영 배포 시에는 기본적으로 막고 ALLOW_WEB_SYNC=true 일 때만 허용한다.
 * 로그인이 생기는 2차에서 인증을 붙인다.
 */
export const POST = apiHandler(async (request) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_WEB_SYNC !== "true") {
    throw new ApiError("OPERATOR_DISABLED");
  }

  let ids: ReturnType<typeof parseSourceList>;
  try {
    ids = parseSourceList(new URL(request.url).searchParams.get("source") ?? undefined);
  } catch (e) {
    // 잘못된 source 값은 요청자의 실수이므로 이유를 알려 준다. (입력 검증 문구라 내부 정보가 아니다)
    throw new ApiError("BAD_REQUEST", { message: e instanceof Error ? e.message : undefined });
  }

  const results = await getHousingContainer().syncNotices.execute(ids.length > 0 ? ids : undefined);
  return respond({ status: 200, body: { results } });
});
