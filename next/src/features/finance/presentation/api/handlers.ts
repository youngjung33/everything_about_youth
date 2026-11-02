import type { Clock } from "@/common/application/system";
import { todayInKst } from "@/common/domain/date";
import { ApiError } from "@/common/presentation/api/errors";
import type { ApiResult } from "@/common/presentation/api/respond";
import type { SyncRunRepository } from "@/features/finance/application/ports/sync-run-repository";
import { deadlineIcs } from "@/features/finance/domain/calendar";
import type { GetSchemeDetail } from "@/features/finance/application/use-cases/get-scheme-detail";
import type { ManageSavedSchemes } from "@/features/finance/application/use-cases/manage-saved-schemes";
import { DEFAULT_PAGE_SIZE, type SearchSchemes } from "@/features/finance/application/use-cases/search-schemes";
import { parseSearchParams, type RawSearchParams } from "../search-params";
import {
  buildFinanceMeta,
  toSchemeDetailDto,
  toSchemeListDto,
  toSchemeSummaryDto,
  type FinanceMetaDto,
  type SchemeDetailDto,
  type SchemeListDto,
  type SchemeSummaryDto,
} from "./dto";

export interface FinanceApiDeps {
  searchSchemes: SearchSchemes;
  getSchemeDetail: GetSchemeDetail;
  manageSavedSchemes: ManageSavedSchemes;
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

export async function handleListSchemes(
  searchParams: URLSearchParams,
  deps: FinanceApiDeps,
): Promise<ApiResult<SchemeListDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const result = await deps.searchSchemes.execute({
    filters: parsed.filters,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsePageSize(searchParams),
    profile: parsed.hasProfile ? parsed.profile : undefined,
    verdicts: parsed.hasProfile ? parsed.verdicts : undefined,
  });
  return { status: 200, body: toSchemeListDto(result, todayInKst(deps.clock.now())) };
}

export async function handleGetScheme(
  id: string,
  searchParams: URLSearchParams,
  deps: FinanceApiDeps,
): Promise<ApiResult<SchemeDetailDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const item = await deps.getSchemeDetail.execute(id, parsed.hasProfile ? parsed.profile : undefined);
  if (!item) throw new ApiError("SCHEME_NOT_FOUND");
  return { status: 200, body: toSchemeDetailDto(item, todayInKst(deps.clock.now())) };
}

export async function handleGetMeta(deps: Pick<FinanceApiDeps, "syncRuns">): Promise<ApiResult<FinanceMetaDto>> {
  return { status: 200, body: buildFinanceMeta(await deps.syncRuns.lastSuccessAt()) };
}

export interface SavedIdsDto {
  ids: string[];
}

export interface SavedListDto {
  items: SchemeSummaryDto[];
  total: number;
  today: string;
}

export async function handleListSavedIds(userId: string, deps: Pick<FinanceApiDeps, "manageSavedSchemes">): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedSchemes.listIds(userId) } };
}

export async function handleListSaved(
  userId: string,
  searchParams: URLSearchParams,
  deps: FinanceApiDeps,
): Promise<ApiResult<SavedListDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const items = await deps.manageSavedSchemes.list(userId, parsed.hasProfile ? parsed.profile : undefined);
  const today = todayInKst(deps.clock.now());
  return { status: 200, body: { items: items.map((i) => toSchemeSummaryDto(i, today)), total: items.length, today } };
}

export async function handleSaveScheme(
  userId: string,
  schemeId: string,
  deps: Pick<FinanceApiDeps, "manageSavedSchemes">,
): Promise<ApiResult<{ saved: true }>> {
  const result = await deps.manageSavedSchemes.save(userId, schemeId);
  if (result.status === "not_found") throw new ApiError("SCHEME_NOT_FOUND");
  if (result.status === "limit") {
    throw new ApiError("BAD_REQUEST", { message: `관심 정책은 ${result.max}개까지 저장할 수 있습니다.` });
  }
  return { status: 200, body: { saved: true } };
}

export async function handleUnsaveScheme(
  userId: string,
  schemeId: string,
  deps: Pick<FinanceApiDeps, "manageSavedSchemes">,
): Promise<ApiResult<{ saved: false }>> {
  await deps.manageSavedSchemes.unsave(userId, schemeId);
  return { status: 200, body: { saved: false } };
}

export async function handleMergeSaved(
  userId: string,
  body: { ids: string[] },
  deps: Pick<FinanceApiDeps, "manageSavedSchemes">,
): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedSchemes.merge(userId, body.ids) } };
}

export async function handleSchemeCalendar(
  id: string,
  deps: Pick<FinanceApiDeps, "getSchemeDetail" | "clock">,
): Promise<Response> {
  const item = await deps.getSchemeDetail.execute(id);
  if (!item) throw new ApiError("SCHEME_NOT_FOUND");
  const ics = deadlineIcs({
    schemeId: item.program.id,
    title: item.program.title,
    applicationEnd: item.program.applicationEnd,
    url: item.program.url,
    now: deps.clock.now(),
  });
  if (!ics) throw new ApiError("BAD_REQUEST", { message: "신청 마감일이 없어 캘린더에 넣을 수 없습니다." });
  const filename = `finance-${id}.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
