import type { IsoDate } from "@/common/domain/date";
import { SIDO_LIST } from "@/common/domain/region";
import { formatDday } from "@/common/presentation/format";
import type { EligibilityResult } from "@/features/housing/domain/eligibility/evaluate";
import { VERDICT_LABELS } from "@/features/housing/domain/eligibility/evaluate";
import {
  HOUSING_TYPE_LABELS,
  HOUSING_TYPES,
  NOTICE_STATUS_LABELS,
  NOTICE_STATUSES,
  SOURCE_LABELS,
  SUPPLY_TYPE_LABELS,
  SUPPLY_TYPES,
} from "@/features/housing/domain/enums";
import { summarizeUnits } from "@/features/housing/domain/notice";
import type { NoticeListItem, SearchNoticesOutput } from "@/features/housing/application/use-cases/search-notices";
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

export interface NoticeSummaryDto {
  id: string;
  title: string;
  organization: string;
  supplyType: string;
  supplyTypeLabel: string;
  housingTypes: string[];
  housingTypeLabels: string[];
  status: string;
  statusLabel: string;
  /** "D-3", "오늘 마감", "D-5 시작", "마감" 등. 없으면 null */
  dday: string | null;
  regions: RegionDto[];
  regionLabel: string;
  applicationStart: string | null;
  applicationEnd: string | null;
  announcementDate: string | null;
  totalHouseholds: number | null;
  minDeposit: number | null;
  minMonthlyRent: number | null;
  minAreaM2: number | null;
  maxAreaM2: number | null;
  url: string | null;
  sourceLabels: string[];
  /** '내 조건'을 보냈을 때만 값이 있다 */
  eligibility: EligibilityDto | null;
}

export interface UnitTypeDto {
  name: string | null;
  exclusiveAreaM2: number | null;
  households: number | null;
  deposit: number | null;
  monthlyRent: number | null;
}

export interface ComplexDto {
  name: string | null;
  address: string | null;
  region: RegionDto | null;
  housingType: string;
  housingTypeLabel: string;
  households: number | null;
  units: UnitTypeDto[];
}

export interface NoticeSourceDto {
  source: string;
  sourceLabel: string;
  externalId: string;
  url: string | null;
  fetchedAt: string;
}

export interface NoticeDetailDto extends NoticeSummaryDto {
  winnerAnnouncementDate: string | null;
  eligibilityText: string | null;
  complexes: ComplexDto[];
  sources: NoticeSourceDto[];
}

export interface NoticeListDto {
  items: NoticeSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** 서버(KST) 기준 오늘 */
  today: string;
}

export interface OptionDto {
  value: string;
  label: string;
}

export interface HousingMetaDto {
  supplyTypes: OptionDto[];
  housingTypes: OptionDto[];
  statuses: OptionDto[];
  verdicts: OptionDto[];
  sorts: OptionDto[];
  sidos: string[];
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

export function toNoticeSummaryDto(item: NoticeListItem, today: IsoDate): NoticeSummaryDto {
  const { notice, status, eligibility } = item;
  const units = summarizeUnits(notice);
  return {
    id: notice.id,
    title: notice.title,
    organization: notice.organization,
    supplyType: notice.supplyType,
    supplyTypeLabel: SUPPLY_TYPE_LABELS[notice.supplyType],
    housingTypes: notice.housingTypes,
    housingTypeLabels: notice.housingTypes.map((h) => HOUSING_TYPE_LABELS[h]),
    status,
    statusLabel: NOTICE_STATUS_LABELS[status],
    dday: formatDday(notice.applicationStart, notice.applicationEnd, today),
    regions: notice.regions.map((r) => ({ sido: r.sido, sigungu: r.sigungu })),
    regionLabel: regionLabel(notice.regions),
    applicationStart: notice.applicationStart,
    applicationEnd: notice.applicationEnd,
    announcementDate: notice.announcementDate,
    totalHouseholds: notice.totalHouseholds,
    minDeposit: units.minDeposit,
    minMonthlyRent: units.minMonthlyRent,
    minAreaM2: units.minAreaM2,
    maxAreaM2: units.maxAreaM2,
    url: notice.url,
    sourceLabels: [...new Set(notice.sources.map((s) => SOURCE_LABELS[s.source]))],
    eligibility: toEligibilityDto(eligibility),
  };
}

export function toNoticeDetailDto(item: NoticeListItem, today: IsoDate): NoticeDetailDto {
  const { notice } = item;
  return {
    ...toNoticeSummaryDto(item, today),
    winnerAnnouncementDate: notice.winnerAnnouncementDate,
    eligibilityText: notice.eligibilityText,
    complexes: notice.complexes.map((c) => ({
      name: c.name,
      address: c.address,
      region: c.region ? { sido: c.region.sido, sigungu: c.region.sigungu } : null,
      housingType: c.housingType,
      housingTypeLabel: HOUSING_TYPE_LABELS[c.housingType],
      households: c.households,
      units: c.units.map((u) => ({
        name: u.name,
        exclusiveAreaM2: u.exclusiveAreaM2,
        households: u.households,
        deposit: u.deposit,
        monthlyRent: u.monthlyRent,
      })),
    })),
    sources: notice.sources.map((s) => ({
      source: s.source,
      sourceLabel: SOURCE_LABELS[s.source],
      externalId: s.externalId,
      url: s.url,
      fetchedAt: s.fetchedAt,
    })),
  };
}

export function toNoticeListDto(result: SearchNoticesOutput, today: IsoDate): NoticeListDto {
  return {
    items: result.items.map((i) => toNoticeSummaryDto(i, today)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    today,
  };
}

export function buildMeta(): HousingMetaDto {
  return {
    supplyTypes: SUPPLY_TYPES.map((value) => ({ value, label: SUPPLY_TYPE_LABELS[value] })),
    housingTypes: HOUSING_TYPES.map((value) => ({ value, label: HOUSING_TYPE_LABELS[value] })),
    statuses: NOTICE_STATUSES.map((value) => ({ value, label: NOTICE_STATUS_LABELS[value] })),
    verdicts: (Object.keys(VERDICT_LABELS) as Array<keyof typeof VERDICT_LABELS>).map((value) => ({
      value,
      label: VERDICT_LABELS[value],
    })),
    sorts: [
      { value: "deadline", label: "마감 임박순" },
      { value: "latest", label: "최신 공고순" },
    ],
    sidos: [...SIDO_LIST],
  };
}
