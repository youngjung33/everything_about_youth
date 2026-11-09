import type { IsoDate } from "@/common/domain/date";
import { SIDO_LIST } from "@/common/domain/region";
import { formatDday } from "@/common/presentation/format";
import type { EligibilityResult } from "@/features/jobs/domain/eligibility/evaluate";
import { VERDICT_LABELS } from "@/features/jobs/domain/eligibility/evaluate";
import { MAX_HOUSEHOLD_SIZE, STANDARDS_YEAR, URBAN_WORKER_INCOME_100 } from "@/features/jobs/domain/eligibility/standards";
import {
  HIRE_TYPE_IDS,
  HIRE_TYPE_LABELS,
  POSTING_STATUS_LABELS,
  POSTING_STATUSES,
  SOURCE_LABELS,
} from "@/features/jobs/domain/enums";
import { googleCalendarDeadlineUrl } from "@/features/jobs/domain/calendar";
import type { PostingListItem, SearchJobPostingsOutput } from "@/features/jobs/application/use-cases/search-job-postings";
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

export interface PostingSummaryDto {
  id: string;
  title: string;
  organization: string;
  hireTypeId: string;
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

export interface PostingSourceDto {
  source: string;
  sourceLabel: string;
  externalId: string;
  url: string | null;
  fetchedAt: string;
}

export interface PostingDetailDto extends PostingSummaryDto {
  googleCalendarUrl: string | null;
  sources: PostingSourceDto[];
}

export interface PostingListDto {
  items: PostingSummaryDto[];
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

export interface JobsMetaDto {
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

export function toPostingSummaryDto(item: PostingListItem, today: IsoDate): PostingSummaryDto {
  const { program, status, eligibility } = item;
  return {
    id: program.id,
    title: program.title,
    organization: program.organization,
    hireTypeId: program.hireTypeId,
    categoryLabel: HIRE_TYPE_LABELS[program.hireTypeId],
    tags: program.tags,
    status,
    statusLabel: POSTING_STATUS_LABELS[status],
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

export function toPostingDetailDto(item: PostingListItem, today: IsoDate): PostingDetailDto {
  const { program } = item;
  return {
    ...toPostingSummaryDto(item, today),
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

export function toPostingListDto(result: SearchJobPostingsOutput, today: IsoDate): PostingListDto {
  return {
    items: result.items.map((i) => toPostingSummaryDto(i, today)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    today,
  };
}

export function buildJobsMeta(dataUpdatedAt: string | null = null): JobsMetaDto {
  return {
    dataUpdatedAt,
    categories: HIRE_TYPE_IDS.map((value) => ({ value, label: HIRE_TYPE_LABELS[value] })),
    statuses: POSTING_STATUSES.map((value) => ({ value, label: POSTING_STATUS_LABELS[value] })),
    verdicts: (Object.keys(VERDICT_LABELS) as Array<keyof typeof VERDICT_LABELS>).map((value) => ({
      value,
      label: VERDICT_LABELS[value],
    })),
    sorts: [
      { value: "deadline", label: "마감 임박순" },
      { value: "latest", label: "최신 공고순" },
    ],
    sidos: [...SIDO_LIST],
    standards: {
      year: STANDARDS_YEAR,
      maxHouseholdSize: MAX_HOUSEHOLD_SIZE,
      urbanWorkerIncome: [...URBAN_WORKER_INCOME_100],
    },
  };
}
