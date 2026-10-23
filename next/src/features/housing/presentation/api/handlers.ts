import type { Clock } from "@/common/application/system";
import { todayInKst } from "@/common/domain/date";
import { ApiError } from "@/common/presentation/api/errors";
import type { ApiResult } from "@/common/presentation/api/respond";
import type { SyncRunRepository } from "@/features/housing/application/ports/sync-run-repository";
import { deadlineIcs } from "@/features/housing/domain/calendar";
import type { GetNoticeDetail } from "@/features/housing/application/use-cases/get-notice-detail";
import type { ManageSavedNotices } from "@/features/housing/application/use-cases/manage-saved-notices";
import { DEFAULT_PAGE_SIZE, type SearchNotices } from "@/features/housing/application/use-cases/search-notices";
import { parseSearchParams, type RawSearchParams } from "../search-params";
import {
  buildMeta,
  toNoticeDetailDto,
  toNoticeListDto,
  toNoticeSummaryDto,
  type HousingMetaDto,
  type NoticeDetailDto,
  type NoticeListDto,
  type NoticeSummaryDto,
} from "./dto";

/** HTTP 와 무관한 API 처리 로직. 라우트 파일은 이 결과를 Response 로 감싸기만 한다. */
export interface HousingApiDeps {
  searchNotices: SearchNotices;
  getNoticeDetail: GetNoticeDetail;
  manageSavedNotices: ManageSavedNotices;
  syncRuns: Pick<SyncRunRepository, "lastSuccessAt">;
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
export async function handleGetMeta(deps: Pick<HousingApiDeps, "syncRuns">): Promise<ApiResult<HousingMetaDto>> {
  return { status: 200, body: buildMeta(await deps.syncRuns.lastSuccessAt()) };
}

export interface SavedIdsDto {
  ids: string[];
}

export interface SavedListDto {
  items: NoticeSummaryDto[];
  total: number;
  today: string;
}

/** GET /api/v1/housing/saved/ids  — 목록 하트 표시용 */
export async function handleListSavedIds(userId: string, deps: Pick<HousingApiDeps, "manageSavedNotices">): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedNotices.listIds(userId) } };
}

/** GET /api/v1/housing/saved  — 관심 공고 목록. '내 조건' 쿼리가 있으면 자격 판정 포함 */
export async function handleListSaved(
  userId: string,
  searchParams: URLSearchParams,
  deps: HousingApiDeps,
): Promise<ApiResult<SavedListDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const items = await deps.manageSavedNotices.list(userId, parsed.hasProfile ? parsed.profile : undefined);
  const today = todayInKst(deps.clock.now());
  return { status: 200, body: { items: items.map((i) => toNoticeSummaryDto(i, today)), total: items.length, today } };
}

/** PUT /api/v1/housing/saved/:id */
export async function handleSaveNotice(
  userId: string,
  noticeId: string,
  deps: Pick<HousingApiDeps, "manageSavedNotices">,
): Promise<ApiResult<{ saved: true }>> {
  const result = await deps.manageSavedNotices.save(userId, noticeId);
  if (result.status === "not_found") throw new ApiError("NOTICE_NOT_FOUND");
  if (result.status === "limit") {
    throw new ApiError("BAD_REQUEST", { message: `관심 공고는 ${result.max}개까지 저장할 수 있습니다.` });
  }
  return { status: 200, body: { saved: true } };
}

/** DELETE /api/v1/housing/saved/:id */
export async function handleUnsaveNotice(
  userId: string,
  noticeId: string,
  deps: Pick<HousingApiDeps, "manageSavedNotices">,
): Promise<ApiResult<{ saved: false }>> {
  await deps.manageSavedNotices.unsave(userId, noticeId);
  return { status: 200, body: { saved: false } };
}

/** PUT /api/v1/housing/saved  { ids: string[] }  — 비회원 기기 목록을 회원에 합친다 */
export async function handleMergeSaved(
  userId: string,
  raw: unknown,
  deps: Pick<HousingApiDeps, "manageSavedNotices">,
): Promise<ApiResult<SavedIdsDto>> {
  const ids = Array.isArray((raw as { ids?: unknown } | null)?.ids)
    ? (raw as { ids: unknown[] }).ids.filter((v): v is string => typeof v === "string")
    : null;
  if (!ids) throw new ApiError("BAD_REQUEST", { message: "ids 배열이 필요합니다." });
  return { status: 200, body: { ids: await deps.manageSavedNotices.merge(userId, ids) } };
}

/** GET /api/v1/housing/notices/:id/calendar  — 접수 마감 ICS (캘린더 앱이 연다) */
export async function handleNoticeCalendar(
  id: string,
  deps: Pick<HousingApiDeps, "getNoticeDetail" | "clock">,
): Promise<Response> {
  const item = await deps.getNoticeDetail.execute(id);
  if (!item) throw new ApiError("NOTICE_NOT_FOUND");
  const ics = deadlineIcs({
    noticeId: item.notice.id,
    title: item.notice.title,
    applicationEnd: item.notice.applicationEnd,
    url: item.notice.url,
    now: deps.clock.now(),
  });
  if (!ics) throw new ApiError("BAD_REQUEST", { message: "접수 마감일이 없어 캘린더에 넣을 수 없습니다." });
  const filename = `housing-${id}.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
