import { ApiError } from "@/common/presentation/api/errors";
import { assertOperator } from "@/common/presentation/api/operator";
import { apiHandler, respond } from "@/common/presentation/api/respond";
import { parseSourceList } from "@/features/housing/infrastructure/config";
import { getHousingContainer } from "@/features/housing/infrastructure/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 수동 수집 트리거(운영자용). 앱 사용자의 JWT 와는 별개로 `X-Operator-Token` 헤더가 `OPERATOR_TOKEN` 과 같아야 한다.
 * 운영에서 `OPERATOR_TOKEN` 이 없으면 이 API 는 꺼져 있다. 평소 수집은 `HOUSING_SYNC_INTERVAL_MINUTES` 자동 수집이 한다.
 */
export const POST = apiHandler(async (request) => {
  assertOperator(request);

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
