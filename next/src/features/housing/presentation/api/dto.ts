import type { IsoDate } from "@/common/domain/date";
import { SIDO_LIST } from "@/common/domain/region";
import { formatDday } from "@/common/presentation/format";
import type { EligibilityResult } from "@/features/housing/domain/eligibility/evaluate";
import { VERDICT_LABELS } from "@/features/housing/domain/eligibility/evaluate";
import {
  MAX_HOUSEHOLD_SIZE,
  MEDIAN_INCOME_100,
  STANDARDS_YEAR,
  URBAN_WORKER_INCOME_100,
} from "@/features/housing/domain/eligibility/standards";
import {
  HOUSING_TYPE_LABELS,
  HOUSING_TYPES,
  NOTICE_STATUS_LABELS,
  NOTICE_STATUSES,
  SOURCE_LABELS,
  SUPPLY_TYPE_LABELS,
  SUPPLY_TYPES,
} from "@/features/housing/domain/enums";
import { googleCalendarDeadlineUrl } from "@/features/housing/domain/calendar";
import { summarizeUnits } from "@/features/housing/domain/notice";
import type { NoticeListItem, SearchNoticesOutput } from "@/features/housing/application/use-cases/search-notices";
import { regionLabel } from "../region-label";

/**
 * 모바일/웹 앱(Flutter)이 소비하는 JSON 계약.
 * 값(코드)과 한글 라벨을 함께 내려 클라이언트가 라벨 표를 복제하지 않아도 되게 한다.
 * 금액은 원, 면적은 ㎡, 날짜는 YYYY-MM-DD(KST 기준) 이다.
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

/** API JSON: NoticeSummaryDto. */
export interface NoticeSummaryDto {
  id: string; // id
  title: string; // 제목
  organization: string; // 기관
  supplyType: string; // supplyType
  supplyTypeLabel: string; // supplyTypeLabel
  housingTypes: string[]; // housingTypes
  housingTypeLabels: string[]; // housingTypeLabels
  status: string; // 상태 코드
  statusLabel: string; // 상태 한글
  /** "D-3", "오늘 마감", "D-5 시작", "마감" 등. 없으면 null */
  dday: string | null; // D-day
  regions: RegionDto[]; // regions
  regionLabel: string; // 지역 요약
  applicationStart: string | null; // 접수 시작
  applicationEnd: string | null; // 접수 종료
  announcementDate: string | null; // 공고일
  totalHouseholds: number | null; // totalHouseholds
  minDeposit: number | null; // minDeposit
  minMonthlyRent: number | null; // minMonthlyRent
  minAreaM2: number | null; // minAreaM2
  maxAreaM2: number | null; // maxAreaM2
  url: string | null; // URL
  sourceLabels: string[]; // 출처 라벨
  /** 수집 발췌 본문. 목록·상세 공통 (benefits `summary` 와 동형) */
  eligibilityText: string | null; // eligibilityText
  /** '내 조건'을 보냈을 때만 값이 있다 */
  eligibility: EligibilityDto | null; // 참고 판정
}

/** API JSON: UnitTypeDto. */
export interface UnitTypeDto {
  name: string | null; // name
  exclusiveAreaM2: number | null; // exclusiveAreaM2
  households: number | null; // households
  deposit: number | null; // deposit
  monthlyRent: number | null; // monthlyRent
}

/** 단지·주택형 묶음 */
export interface ComplexDto {
  name: string | null; // name
  address: string | null; // address
  region: RegionDto | null; // region
  housingType: string; // housingType
  housingTypeLabel: string; // housingTypeLabel
  households: number | null; // households
  units: UnitTypeDto[]; // units
}

/** 수집 출처 한 건 */
export interface NoticeSourceDto {
  source: string; // 소스 id
  sourceLabel: string; // 소스 한글
  externalId: string; // 외부 id
  url: string | null; // URL
  fetchedAt: string; // 수집 시각
}

export interface NoticeDetailDto extends NoticeSummaryDto {
  winnerAnnouncementDate: string | null; // winnerAnnouncementDate
  complexes: ComplexDto[]; // complexes
  sources: NoticeSourceDto[]; // 출처
  /** 접수 마감일을 Google 캘린더에 넣는 주소. 마감일이 없으면 null */
  googleCalendarUrl: string | null; // 캘린더 URL
}

/** API JSON: NoticeListDto. */
export interface NoticeListDto {
  items: NoticeSummaryDto[]; // 항목
  total: number; // 총 건수
  page: number; // 페이지
  pageSize: number; // pageSize
  totalPages: number; // 총 페이지
  /** 서버(KST) 기준 오늘 */
  today: string; // 기준일
}

/** API JSON: OptionDto. */
export interface OptionDto {
  value: string; // 코드
  label: string; // 한글
}

/** 자격 판정에 쓰는 기준표(참고용). 앱이 입력 화면에서 소득 수준을 안내할 때 쓴다. */
export interface EligibilityStandardsDto {
  /** 기준표 적용 연도 */
  year: number; // 기준 연도
  maxHouseholdSize: number; // 가구원 상한
  /** 전년도 도시근로자 가구원수별 월평균소득 100% (원). 인덱스 0 = 1인 가구 */
  urbanWorkerIncome: number[]; // 월소득 표
  /** 기준 중위소득 100% (원). 인덱스 0 = 1인 가구 */
  medianIncome: number[]; // medianIncome
}

/** API JSON: HousingMetaDto. */
export interface HousingMetaDto {
  /** 공고 데이터가 마지막으로 갱신된(수집에 성공한) 시각. ISO 8601 UTC. 한 번도 수집하지 않았으면 null */
  dataUpdatedAt: string | null; // 수집 시각
  supplyTypes: OptionDto[]; // supplyTypes
  housingTypes: OptionDto[]; // housingTypes
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

/** 목록·관심 API용 요약 DTO */
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
    eligibilityText: notice.eligibilityText,
    eligibility: toEligibilityDto(eligibility),
  };
}

/** 상세 API DTO */
export function toNoticeDetailDto(item: NoticeListItem, today: IsoDate): NoticeDetailDto {
  const { notice } = item;
  return {
    ...toNoticeSummaryDto(item, today),
    winnerAnnouncementDate: notice.winnerAnnouncementDate,
    googleCalendarUrl: googleCalendarDeadlineUrl({
      title: notice.title,
      applicationEnd: notice.applicationEnd,
      bodyExcerpt: notice.eligibilityText,
      url: notice.url,
    }),
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

/** 목록 API DTO */
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

/** GET /meta 응답 본문 */
export function buildMeta(dataUpdatedAt: string | null = null): HousingMetaDto {
  return {
    dataUpdatedAt,
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
    standards: {
      year: STANDARDS_YEAR,
      maxHouseholdSize: MAX_HOUSEHOLD_SIZE,
      urbanWorkerIncome: [...URBAN_WORKER_INCOME_100],
      medianIncome: [...MEDIAN_INCOME_100],
    },
  };
}
