import type { IsoDate } from "@/common/domain/date";
import { SIDO_LIST } from "@/common/domain/region";
import { formatDday } from "@/common/presentation/format";
import {
  PROCEDURE_TYPE_IDS,
  PROCEDURE_TYPE_LABELS,
  GUIDE_STATUS_LABELS,
  GUIDE_STATUSES,
  SOURCE_LABELS,
} from "@/features/living/domain/enums";
import { googleCalendarDeadlineUrl } from "@/features/living/domain/calendar";
import type { ChecklistStep } from "@/features/living/domain/guide";
import type { GuideListItem, SearchGuidesOutput } from "@/features/living/application/use-cases/search-guides";
import { regionLabel } from "../region-label";

export interface RegionDto {
  sido: string;
  sigungu: string | null;
}

export interface ChecklistStepDto {
  order: number;
  title: string;
  summary: string;
  url: string | null;
}

export interface GuideSummaryDto {
  id: string;
  title: string;
  organization: string;
  procedureTypeId: string;
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
  eligibility: null;
}

export interface GuideSourceDto {
  source: string;
  sourceLabel: string;
  externalId: string;
  url: string | null;
  fetchedAt: string;
}

export interface GuideDetailDto extends GuideSummaryDto {
  checklistSteps: ChecklistStepDto[];
  googleCalendarUrl: string | null;
  sources: GuideSourceDto[];
}

export interface GuideListDto {
  items: GuideSummaryDto[];
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

export interface LivingMetaDto {
  dataUpdatedAt: string | null;
  procedureTypes: OptionDto[];
  statuses: OptionDto[];
  sorts: OptionDto[];
  sidos: string[];
}

function toChecklistStepDto(step: ChecklistStep): ChecklistStepDto {
  return {
    order: step.order,
    title: step.title,
    summary: step.summary,
    url: step.url,
  };
}

export function toGuideSummaryDto(item: GuideListItem, today: IsoDate): GuideSummaryDto {
  const { program, status } = item;
  return {
    id: program.id,
    title: program.title,
    organization: program.organization,
    procedureTypeId: program.procedureTypeId,
    categoryLabel: PROCEDURE_TYPE_LABELS[program.procedureTypeId],
    tags: program.tags,
    status,
    statusLabel: GUIDE_STATUS_LABELS[status],
    dday: formatDday(program.applicationStart, program.applicationEnd, today),
    regions: program.regions.map((r) => ({ sido: r.sido, sigungu: r.sigungu })),
    regionLabel: regionLabel(program.regions),
    applicationStart: program.applicationStart,
    applicationEnd: program.applicationEnd,
    announcementDate: program.announcementDate,
    summary: program.summary,
    url: program.url,
    sourceLabels: [...new Set(program.sources.map((s) => SOURCE_LABELS[s.source]))],
    eligibility: null,
  };
}

export function toGuideDetailDto(item: GuideListItem, today: IsoDate): GuideDetailDto {
  const { program } = item;
  return {
    ...toGuideSummaryDto(item, today),
    checklistSteps: program.checklistSteps.map(toChecklistStepDto),
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

export function toGuideListDto(result: SearchGuidesOutput, today: IsoDate): GuideListDto {
  return {
    items: result.items.map((i) => toGuideSummaryDto(i, today)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    today,
  };
}

export function buildLivingMeta(dataUpdatedAt: string | null = null): LivingMetaDto {
  return {
    dataUpdatedAt,
    procedureTypes: PROCEDURE_TYPE_IDS.map((value) => ({ value, label: PROCEDURE_TYPE_LABELS[value] })),
    statuses: GUIDE_STATUSES.map((value) => ({ value, label: GUIDE_STATUS_LABELS[value] })),
    sorts: [
      { value: "deadline", label: "마감 임박순" },
      { value: "latest", label: "최신 안내순" },
    ],
    sidos: [...SIDO_LIST],
  };
}
