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

export interface ProgramSummaryDto {
  id: string;
  title: string;
  organization: string;
  categoryId: string;
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

export interface ProgramDetailDto extends ProgramSummaryDto {
  googleCalendarUrl: string | null;
  sources: ProgramSourceDto[];
}

export interface ProgramListDto {
  items: ProgramSummaryDto[];
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

export interface EligibilityStandardsDto {
  year: number;
  maxHouseholdSize: number;
  urbanWorkerIncome: number[];
}

export interface BenefitsMetaDto {
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
