import type { Clock } from "@/common/application/system";
import { todayInKst } from "@/common/domain/date";
import { ApiError } from "@/common/presentation/api/errors";
import type { ApiResult } from "@/common/presentation/api/respond";
import type { SyncRunRepository } from "@/features/living/application/ports/sync-run-repository";
import { deadlineIcs } from "@/features/living/domain/calendar";
import type { GetGuideDetail } from "@/features/living/application/use-cases/get-guide-detail";
import type { ManageSavedGuides } from "@/features/living/application/use-cases/manage-saved-guides";
import { DEFAULT_PAGE_SIZE, type SearchGuides } from "@/features/living/application/use-cases/search-guides";
import { parseSearchParams, type RawSearchParams } from "../search-params";
import {
  buildLivingMeta,
  toGuideDetailDto,
  toGuideListDto,
  toGuideSummaryDto,
  type LivingMetaDto,
  type GuideDetailDto,
  type GuideListDto,
  type GuideSummaryDto,
} from "./dto";

export interface LivingApiDeps {
  searchGuides: SearchGuides;
  getGuideDetail: GetGuideDetail;
  manageSavedGuides: ManageSavedGuides;
  syncRuns: Pick<SyncRunRepository, "lastSuccessAt">;
  clock: Clock;
}

export const MAX_API_PAGE_SIZE = 50;

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

export async function handleListGuides(
  searchParams: URLSearchParams,
  deps: LivingApiDeps,
): Promise<ApiResult<GuideListDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const result = await deps.searchGuides.execute({
    filters: parsed.filters,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsePageSize(searchParams),
  });
  return { status: 200, body: toGuideListDto(result, todayInKst(deps.clock.now())) };
}

export async function handleGetGuide(
  id: string,
  _searchParams: URLSearchParams,
  deps: LivingApiDeps,
): Promise<ApiResult<GuideDetailDto>> {
  const item = await deps.getGuideDetail.execute(id);
  if (!item) throw new ApiError("GUIDE_NOT_FOUND");
  return { status: 200, body: toGuideDetailDto(item, todayInKst(deps.clock.now())) };
}

export async function handleGetMeta(deps: Pick<LivingApiDeps, "syncRuns">): Promise<ApiResult<LivingMetaDto>> {
  return { status: 200, body: buildLivingMeta(await deps.syncRuns.lastSuccessAt()) };
}

export interface SavedIdsDto {
  ids: string[];
}

export interface SavedListDto {
  items: GuideSummaryDto[];
  total: number;
  today: string;
}

export async function handleListSavedIds(userId: string, deps: Pick<LivingApiDeps, "manageSavedGuides">): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedGuides.listIds(userId) } };
}

export async function handleListSaved(
  userId: string,
  _searchParams: URLSearchParams,
  deps: LivingApiDeps,
): Promise<ApiResult<SavedListDto>> {
  const items = await deps.manageSavedGuides.list(userId);
  const today = todayInKst(deps.clock.now());
  return { status: 200, body: { items: items.map((i) => toGuideSummaryDto(i, today)), total: items.length, today } };
}

export async function handleSaveGuide(
  userId: string,
  guideId: string,
  deps: Pick<LivingApiDeps, "manageSavedGuides">,
): Promise<ApiResult<{ saved: true }>> {
  const result = await deps.manageSavedGuides.save(userId, guideId);
  if (result.status === "not_found") throw new ApiError("GUIDE_NOT_FOUND");
  if (result.status === "limit") {
    throw new ApiError("BAD_REQUEST", { message: `관심 안내는 ${result.max}개까지 저장할 수 있습니다.` });
  }
  return { status: 200, body: { saved: true } };
}

export async function handleUnsaveGuide(
  userId: string,
  guideId: string,
  deps: Pick<LivingApiDeps, "manageSavedGuides">,
): Promise<ApiResult<{ saved: false }>> {
  await deps.manageSavedGuides.unsave(userId, guideId);
  return { status: 200, body: { saved: false } };
}

export async function handleMergeSaved(
  userId: string,
  body: { ids: string[] },
  deps: Pick<LivingApiDeps, "manageSavedGuides">,
): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedGuides.merge(userId, body.ids) } };
}

export async function handleGuideCalendar(
  id: string,
  deps: Pick<LivingApiDeps, "getGuideDetail" | "clock">,
): Promise<Response> {
  const item = await deps.getGuideDetail.execute(id);
  if (!item) throw new ApiError("GUIDE_NOT_FOUND");
  const ics = deadlineIcs({
    guideId: item.program.id,
    title: item.program.title,
    applicationEnd: item.program.applicationEnd,
    url: item.program.url,
    now: deps.clock.now(),
  });
  if (!ics) throw new ApiError("BAD_REQUEST", { message: "마감일이 없어 캘린더에 넣을 수 없습니다." });
  const filename = `living-${id}.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
