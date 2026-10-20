import type { Clock } from "@/common/application/system";
import { todayInKst } from "@/common/domain/date";
import { ApiError } from "@/common/presentation/api/errors";
import type { ApiResult } from "@/common/presentation/api/respond";
import type { GetNoticeDetail } from "@/features/housing/application/use-cases/get-notice-detail";
import { DEFAULT_PAGE_SIZE, type SearchNotices } from "@/features/housing/application/use-cases/search-notices";
import { parseSearchParams, type RawSearchParams } from "../search-params";
import {
  buildMeta,
  toNoticeDetailDto,
  toNoticeListDto,
  type HousingMetaDto,
  type NoticeDetailDto,
  type NoticeListDto,
} from "./dto";

/** HTTP 와 무관한 API 처리 로직. 라우트 파일은 이 결과를 Response 로 감싸기만 한다. */
export interface HousingApiDeps {
  searchNotices: SearchNotices;
  getNoticeDetail: GetNoticeDetail;
  clock: Clock;
}

export const MAX_API_PAGE_SIZE = 50;

/** `?sido=서울&sido=경기` 처럼 반복된 키를 배열로 유지해 웹 페이지와 같은 파서를 재사용한다. */
export function toRawSearchParams(searchParams: URLSearchParams): RawSearchParams {
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    raw[key] = values.length === 1 ? values[0]! : values;
  }
  return raw;
}

function parsePageSize(searchParams: URLSearchParams): number {
  const n = Number(searchParams.get("pageSize"));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_API_PAGE_SIZE, Math.floor(n));
}

/**
 * GET /api/v1/housing/notices
 * 필터·정렬·페이지·'내 조건'·판정 필터(v) 파라미터는 웹 목록 화면과 동일하다. 추가로 pageSize(1~50).
 */
export async function handleListNotices(
  searchParams: URLSearchParams,
  deps: HousingApiDeps,
): Promise<ApiResult<NoticeListDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const result = await deps.searchNotices.execute({
    filters: parsed.filters,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsePageSize(searchParams),
    profile: parsed.hasProfile ? parsed.profile : undefined,
    verdicts: parsed.hasProfile ? parsed.verdicts : undefined,
  });
  return { status: 200, body: toNoticeListDto(result, todayInKst(deps.clock.now())) };
}

/** GET /api/v1/housing/notices/:id  ('내 조건' 파라미터를 주면 자격 판정 포함) */
export async function handleGetNotice(
  id: string,
  searchParams: URLSearchParams,
  deps: HousingApiDeps,
): Promise<ApiResult<NoticeDetailDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const item = await deps.getNoticeDetail.execute(id, parsed.hasProfile ? parsed.profile : undefined);
  if (!item) throw new ApiError("NOTICE_NOT_FOUND");
  return { status: 200, body: toNoticeDetailDto(item, todayInKst(deps.clock.now())) };
}

/** GET /api/v1/housing/meta  (필터 선택지와 라벨) */
export function handleGetMeta(): ApiResult<HousingMetaDto> {
  return { status: 200, body: buildMeta() };
}
