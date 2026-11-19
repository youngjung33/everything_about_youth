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

/** HTTP 와 무관한 API 처리. 라우트는 Response 로 감싸기만 */
export interface BenefitsApiDeps {
  searchPrograms: SearchPrograms;
  getProgramDetail: GetProgramDetail;
  manageSavedPrograms: ManageSavedPrograms;
  syncRuns: Pick<SyncRunRepository, "lastSuccessAt">;
  clock: Clock;
}

/** 목록 API pageSize 상한 */
export const MAX_API_PAGE_SIZE = 50;

/** 반복 쿼리 키를 배열로 유지해 웹 파서 재사용 */
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
 * GET /api/v1/benefits/programs
 * 필터·정렬·페이지·내 조건·판정(v) 은 웹 목록과 동일. pageSize 1~50.
 */
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

/** GET /api/v1/benefits/programs/:id (내 조건 있으면 자격 판정) */
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

/** GET /api/v1/benefits/meta */
export async function handleGetMeta(deps: Pick<BenefitsApiDeps, "syncRuns">): Promise<ApiResult<BenefitsMetaDto>> {
  return { status: 200, body: buildMeta(await deps.syncRuns.lastSuccessAt()) };
}

/** 관심 ID 목록 */
export interface SavedIdsDto {
  ids: string[];
}

/** 관심 정책 목록 응답 */
export interface SavedListDto {
  items: ProgramSummaryDto[];
  total: number;
  today: string;
}

/** GET /api/v1/benefits/saved/ids — 하트 표시용 */
export async function handleListSavedIds(userId: string, deps: Pick<BenefitsApiDeps, "manageSavedPrograms">): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedPrograms.listIds(userId) } };
}

/** GET /api/v1/benefits/saved — 관심 목록. 내 조건 있으면 자격 포함 */
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

/** PUT /api/v1/benefits/saved/:id */
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

/** DELETE /api/v1/benefits/saved/:id */
export async function handleUnsaveProgram(
  userId: string,
  programId: string,
  deps: Pick<BenefitsApiDeps, "manageSavedPrograms">,
): Promise<ApiResult<{ saved: false }>> {
  await deps.manageSavedPrograms.unsave(userId, programId);
  return { status: 200, body: { saved: false } };
}

/** PUT /api/v1/benefits/saved { ids } — 비회원 목록 합치기 */
export async function handleMergeSaved(
  userId: string,
  body: { ids: string[] },
  deps: Pick<BenefitsApiDeps, "manageSavedPrograms">,
): Promise<ApiResult<SavedIdsDto>> {
  return { status: 200, body: { ids: await deps.manageSavedPrograms.merge(userId, body.ids) } };
}

/** GET /api/v1/benefits/programs/:id/calendar — 마감 ICS */
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
