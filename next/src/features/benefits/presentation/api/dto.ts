import type { IsoDate } from "@/common/domain/date";
import { SIDO_LIST } from "@/common/domain/region";
import { formatDday } from "@/common/presentation/format";
import type { EligibilityResult } from "@/features/benefits/domain/eligibility/evaluate";
import { VERDICT_LABELS } from "@/features/benefits/domain/eligibility/evaluate";
import { MAX_HOUSEHOLD_SIZE, STANDARDS_YEAR, URBAN_WORKER_INCOME_100 } from "@/features/benefits/domain/eligibility/standards";
import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  PROGRAM_STATUS_LABELS,
  PROGRAM_STATUSES,
  SOURCE_LABELS,
} from "@/features/benefits/domain/enums";
import { googleCalendarDeadlineUrl } from "@/features/benefits/domain/calendar";
import type { ProgramListItem, SearchProgramsOutput } from "@/features/benefits/application/use-cases/search-programs";
import { regionLabel } from "../region-label";

/**
 * 모바일/웹(Flutter) JSON 계약. 코드와 한글 라벨 동시 제공.
 * 금액 원, 날짜 YYYY-MM-DD(KST).
 */
export interface EligibilityDto {
  verdict: string; // 판정 코드
  verdictLabel: string; // 판정 한글 라벨
  reasons: string[]; // 판정 사유
  notes: string[]; // 추가 안내
}

/** API JSON: RegionDto. */
export interface RegionDto {
  sido: string; // 시·도
  sigungu: string | null; // 시·군·구
}

/** 목록·관심 API용 요약 */
export interface ProgramSummaryDto {
  id: string; // id
  title: string; // 제목
  organization: string; // 기관
  categoryId: string; // categoryId
  categoryLabel: string; // 유형 한글
  tags: string[]; // 태그
  status: string; // 상태 코드
  statusLabel: string; // 상태 한글
  /** "D-3", "오늘 마감" 등. 없으면 null */
  dday: string | null; // D-day
  regions: RegionDto[]; // regions
  regionLabel: string; // 지역 요약
  applicationStart: string | null; // 접수 시작
  applicationEnd: string | null; // 접수 종료
  announcementDate: string | null; // 공고일
  summary: string | null; // 요약
  url: string | null; // URL
  sourceLabels: string[]; // 출처 라벨
  /** 내 조건을 보냈을 때만 */
  eligibility: EligibilityDto | null; // 참고 판정
}

/** 수집 출처 한 건 */
export interface ProgramSourceDto {
  source: string; // 소스 id
  sourceLabel: string; // 소스 한글
  externalId: string; // 외부 id
  url: string | null; // URL
  fetchedAt: string; // 수집 시각
}

export interface ProgramDetailDto extends ProgramSummaryDto {
  googleCalendarUrl: string | null; // 캘린더 URL
  sources: ProgramSourceDto[]; // 출처
}

/** 목록 API 페이로드 */
export interface ProgramListDto {
  items: ProgramSummaryDto[]; // 항목
  total: number; // 총 건수
  page: number; // 페이지
  pageSize: number; // pageSize
  totalPages: number; // 총 페이지
  today: string; // 기준일
}

/** API JSON: OptionDto. */
export interface OptionDto {
  value: string; // 코드
  label: string; // 한글
}

/** API JSON: EligibilityStandardsDto. */
export interface EligibilityStandardsDto {
  year: number; // 기준 연도
  maxHouseholdSize: number; // 가구원 상한
  urbanWorkerIncome: number[]; // 월소득 표
}

/** GET /meta 응답 */
export interface BenefitsMetaDto {
  dataUpdatedAt: string | null; // 수집 시각
  categories: OptionDto[]; // 채용 유형 목록
  statuses: OptionDto[]; // 상태 목록
  verdicts: OptionDto[]; // 판정 목록
  sorts: OptionDto[]; // 정렬 목록
  sidos: string[]; // 시도 목록
  standards: EligibilityStandardsDto; // 기준표
}

/** 판정 DTO 변환. */
function toEligibilityDto(result: EligibilityResult | null): EligibilityDto | null {
  if (!result) return null;
  return {
    verdict: result.verdict,
    verdictLabel: VERDICT_LABELS[result.verdict],
    reasons: result.reasons,
    notes: result.notes,
  };
}

/** ProgramListItem → 요약 DTO */
export function toProgramSummaryDto(item: ProgramListItem, today: IsoDate): ProgramSummaryDto {
  const { program, status, eligibility } = item;
  return {
    id: program.id,
    title: program.title,
    organization: program.organization,
    categoryId: program.categoryId,
    categoryLabel: CATEGORY_LABELS[program.categoryId],
    tags: program.tags,
    status,
    statusLabel: PROGRAM_STATUS_LABELS[status],
    dday: formatDday(program.applicationStart, program.applicationEnd, today),
    regions: program.regions.map((r) => ({ sido: r.sido, sigungu: r.sigungu })),
    regionLabel: regionLabel(program.regions),
    applicationStart: program.applicationStart,
    applicationEnd: program.applicationEnd,
    announcementDate: program.announcementDate,
    summary: program.summary,
    url: program.url,
    sourceLabels: [...new Set(program.sources.map((s) => SOURCE_LABELS[s.source]))],
    eligibility: toEligibilityDto(eligibility),
  };
}

/** 상세 DTO */
export function toProgramDetailDto(item: ProgramListItem, today: IsoDate): ProgramDetailDto {
  const { program } = item;
  return {
    ...toProgramSummaryDto(item, today),
    googleCalendarUrl: googleCalendarDeadlineUrl({
      title: program.title,
      applicationEnd: program.applicationEnd,
      summary: program.summary,
      url: program.url,
    }),
    sources: program.sources.map((s) => ({
      source: s.source,
      sourceLabel: SOURCE_LABELS[s.source],
      externalId: s.externalId,
      url: s.url,
      fetchedAt: s.fetchedAt,
    })),
  };
}

/** 목록 DTO */
export function toProgramListDto(result: SearchProgramsOutput, today: IsoDate): ProgramListDto {
  return {
    items: result.items.map((i) => toProgramSummaryDto(i, today)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    today,
  };
}

/** 필터 선택지·기준표 메타 */
export function buildMeta(dataUpdatedAt: string | null = null): BenefitsMetaDto {
  return {
    dataUpdatedAt,
    categories: CATEGORY_IDS.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
    statuses: PROGRAM_STATUSES.map((value) => ({ value, label: PROGRAM_STATUS_LABELS[value] })),
    verdicts: (Object.keys(VERDICT_LABELS) as Array<keyof typeof VERDICT_LABELS>).map((value) => ({
      value,
      label: VERDICT_LABELS[value],
    })),
    sorts: [
      { value: "deadline", label: "마감 임박순" },
      { value: "latest", label: "최신 정책순" },
    ],
    sidos: [...SIDO_LIST],
    standards: {
      year: STANDARDS_YEAR,
      maxHouseholdSize: MAX_HOUSEHOLD_SIZE,
      urbanWorkerIncome: [...URBAN_WORKER_INCOME_100],
    },
  };
}
