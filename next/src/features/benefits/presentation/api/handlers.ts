import type { Clock } from "@/common/application/system";
import { todayInKst } from "@/common/domain/date";
import { ApiError } from "@/common/presentation/api/errors";
import type { ApiResult } from "@/common/presentation/api/respond";
import type { SyncRunRepository } from "@/features/benefits/application/ports/sync-run-repository";
import { deadlineIcs } from "@/features/benefits/domain/calendar";
import type { GetProgramDetail } from "@/features/benefits/application/use-cases/get-program-detail";
import type { ManageSavedPrograms } from "@/features/benefits/application/use-cases/manage-saved-programs";
import { DEFAULT_PAGE_SIZE, type SearchPrograms } from "@/features/benefits/application/use-cases/search-programs";
import { parseSearchParams, type RawSearchParams } from "../search-params";
import {
  buildMeta,
  toProgramDetailDto,
  toProgramListDto,
  toProgramSummaryDto,
  type BenefitsMetaDto,
  type ProgramDetailDto,
  type ProgramListDto,
  type ProgramSummaryDto,
} from "./dto";

export interface BenefitsApiDeps {
  searchPrograms: SearchPrograms;
  getProgramDetail: GetProgramDetail;
  manageSavedPrograms: ManageSavedPrograms;
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

export async function handleListPrograms(
  searchParams: URLSearchParams,
  deps: BenefitsApiDeps,
): Promise<ApiResult<ProgramListDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const result = await deps.searchPrograms.execute({
    filters: parsed.filters,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsePageSize(searchParams),
    profile: parsed.hasProfile ? parsed.profile : undefined,
    verdicts: parsed.hasProfile ? parsed.verdicts : undefined,
  });
  return { status: 200, body: toProgramListDto(result, todayInKst(deps.clock.now())) };
}

export async function handleGetProgram(
  id: string,
  searchParams: URLSearchParams,
  deps: BenefitsApiDeps,
): Promise<ApiResult<ProgramDetailDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const item = await deps.getProgramDetail.execute(id, parsed.hasProfile ? parsed.profile : undefined);
  if (!item) throw new ApiError("PROGRAM_NOT_FOUND");
  return { status: 200, body: toProgramDetailDto(item, todayInKst(deps.clock.now())) };
}

export async function handleGetMeta(deps: Pick<BenefitsApiDeps, "syncRuns">): Promise<ApiResult<BenefitsMetaDto>> {
  return { status: 200, body: buildMeta(await deps.syncRuns.lastSuccessAt()) };
}

export interface SavedIdsDto {
  ids: string[];
}

export interface SavedListDto {
  items: ProgramSummaryDto[];
  total: number;
  today: string;
}

export async function handleListSavedIds(userId: string, deps: Pick<BenefitsApiDeps, "manageSavedPrograms">): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedPrograms.listIds(userId) } };
}

export async function handleListSaved(
  userId: string,
  searchParams: URLSearchParams,
  deps: BenefitsApiDeps,
): Promise<ApiResult<SavedListDto>> {
  const parsed = parseSearchParams(toRawSearchParams(searchParams));
  const items = await deps.manageSavedPrograms.list(userId, parsed.hasProfile ? parsed.profile : undefined);
  const today = todayInKst(deps.clock.now());
  return { status: 200, body: { items: items.map((i) => toProgramSummaryDto(i, today)), total: items.length, today } };
}

export async function handleSaveProgram(
  userId: string,
  programId: string,
  deps: Pick<BenefitsApiDeps, "manageSavedPrograms">,
): Promise<ApiResult<{ saved: true }>> {
  const result = await deps.manageSavedPrograms.save(userId, programId);
  if (result.status === "not_found") throw new ApiError("PROGRAM_NOT_FOUND");
  if (result.status === "limit") {
    throw new ApiError("BAD_REQUEST", { message: `관심 정책은 ${result.max}개까지 저장할 수 있습니다.` });
  }
  return { status: 200, body: { saved: true } };
}

export async function handleUnsaveProgram(
  userId: string,
  programId: string,
  deps: Pick<BenefitsApiDeps, "manageSavedPrograms">,
): Promise<ApiResult<{ saved: false }>> {
  await deps.manageSavedPrograms.unsave(userId, programId);
  return { status: 200, body: { saved: false } };
}

export async function handleMergeSaved(
  userId: string,
  body: { ids: string[] },
  deps: Pick<BenefitsApiDeps, "manageSavedPrograms">,
): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedPrograms.merge(userId, body.ids) } };
}

export async function handleProgramCalendar(
  id: string,
  deps: Pick<BenefitsApiDeps, "getProgramDetail" | "clock">,
): Promise<Response> {
  const item = await deps.getProgramDetail.execute(id);
  if (!item) throw new ApiError("PROGRAM_NOT_FOUND");
  const ics = deadlineIcs({
    programId: item.program.id,
    title: item.program.title,
    applicationEnd: item.program.applicationEnd,
    url: item.program.url,
    now: deps.clock.now(),
  });
  if (!ics) throw new ApiError("BAD_REQUEST", { message: "신청 마감일이 없어 캘린더에 넣을 수 없습니다." });
  const filename = `benefits-${id}.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
