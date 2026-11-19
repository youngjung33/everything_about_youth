import type { IsoDate } from "@/common/domain/date";
import { SIDO_LIST } from "@/common/domain/region";
import { formatDday } from "@/common/presentation/format";
import type { EligibilityResult } from "@/features/finance/domain/eligibility/evaluate";
import { VERDICT_LABELS } from "@/features/finance/domain/eligibility/evaluate";
import { MAX_HOUSEHOLD_SIZE, STANDARDS_YEAR, URBAN_WORKER_INCOME_100 } from "@/features/finance/domain/eligibility/standards";
import {
  PRODUCT_TYPE_IDS,
  PRODUCT_TYPE_LABELS,
  SCHEME_STATUS_LABELS,
  SCHEME_STATUSES,
  SOURCE_LABELS,
} from "@/features/finance/domain/enums";
import { googleCalendarDeadlineUrl } from "@/features/finance/domain/calendar";
import type { SchemeListItem, SearchSchemesOutput } from "@/features/finance/application/use-cases/search-schemes";
import { regionLabel } from "../region-label";

/**
 * 모바일/웹 앱(Flutter)이 소비하는 JSON 계약.
 * 값(코드)과 한글 라벨을 함께 내려 클라이언트가 라벨 표를 복제하지 않아도 되게 한다.
 * 금액은 원, 면적은 ㎡, 날짜는 YYYY-MM-DD(KST 기준) 이다.
 */
export interface EligibilityDto {
  verdict: string;
  verdictLabel: string;
  reasons: string[];
  notes: string[];
}

export interface RegionDto {
  sido: string;
  sigungu: string | null;
}

export interface SchemeSummaryDto {
  id: string;
  title: string;
  organization: string;
  productTypeId: string;
  categoryLabel: string;
  tags: string[];
  status: string;
  statusLabel: string;
  dday: string | null;
  regions: RegionDto[];
  regionLabel: string;
  applicationStart: string | null;
  applicationEnd: string | null;
  announcementDate: string | null;
  summary: string | null;
  url: string | null;
  sourceLabels: string[];
  eligibility: EligibilityDto | null;
}

export interface ProgramSourceDto {
  source: string;
  sourceLabel: string;
  externalId: string;
  url: string | null;
  fetchedAt: string;
}

export interface SchemeDetailDto extends SchemeSummaryDto {
  googleCalendarUrl: string | null;
  sources: ProgramSourceDto[];
}

export interface SchemeListDto {
  items: SchemeSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  today: string;
}

export interface OptionDto {
  value: string;
  label: string;
}

/** 자격 판정에 쓰는 기준표(참고용). 앱이 입력 화면에서 소득 수준을 안내할 때 쓴다. */
export interface EligibilityStandardsDto {
  year: number;
  maxHouseholdSize: number;
  urbanWorkerIncome: number[];
}

export interface FinanceMetaDto {
  dataUpdatedAt: string | null;
  categories: OptionDto[];
  statuses: OptionDto[];
  verdicts: OptionDto[];
  sorts: OptionDto[];
  sidos: string[];
  standards: EligibilityStandardsDto;
}

function toEligibilityDto(result: EligibilityResult | null): EligibilityDto | null {
  if (!result) return null;
  return {
    verdict: result.verdict,
    verdictLabel: VERDICT_LABELS[result.verdict],
    reasons: result.reasons,
    notes: result.notes,
  };
}

export function toSchemeSummaryDto(item: SchemeListItem, today: IsoDate): SchemeSummaryDto {
  const { program, status, eligibility } = item;
  return {
    id: program.id,
    title: program.title,
    organization: program.organization,
    productTypeId: program.productTypeId,
    categoryLabel: PRODUCT_TYPE_LABELS[program.productTypeId],
    tags: program.tags,
    status,
    statusLabel: SCHEME_STATUS_LABELS[status],
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

export function toSchemeDetailDto(item: SchemeListItem, today: IsoDate): SchemeDetailDto {
  const { program } = item;
  return {
    ...toSchemeSummaryDto(item, today),
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

export function toSchemeListDto(result: SearchSchemesOutput, today: IsoDate): SchemeListDto {
  return {
    items: result.items.map((i) => toSchemeSummaryDto(i, today)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    today,
  };
}

export function buildFinanceMeta(dataUpdatedAt: string | null = null): FinanceMetaDto {
  return {
    dataUpdatedAt,
    categories: PRODUCT_TYPE_IDS.map((value) => ({ value, label: PRODUCT_TYPE_LABELS[value] })),
    statuses: SCHEME_STATUSES.map((value) => ({ value, label: SCHEME_STATUS_LABELS[value] })),
    verdicts: (Object.keys(VERDICT_LABELS) as Array<keyof typeof VERDICT_LABELS>).map((value) => ({
      value,
      label: VERDICT_LABELS[value],
    })),
    sorts: [
      { value: "deadline", label: "마감 임박순" },
      { value: "latest", label: "최신 제도순" },
    ],
    sidos: [...SIDO_LIST],
    standards: {
      year: STANDARDS_YEAR,
      maxHouseholdSize: MAX_HOUSEHOLD_SIZE,
      urbanWorkerIncome: [...URBAN_WORKER_INCOME_100],
    },
  };
}
