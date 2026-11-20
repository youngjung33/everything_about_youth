import type { IsoDate } from "@/common/domain/date";
import type { HousingType, NoticeStatus, SourceId, SupplyType } from "./enums";
import type { Region } from "@/common/domain/region";

/** 세대(평형) 유형. 금액은 원 단위. */
export interface UnitType {
  name: string | null; // name
  /** 전용면적(㎡) */
  exclusiveAreaM2: number | null; // exclusiveAreaM2
  households: number | null; // households
  /** 임대보증금 또는 분양가(원) */
  deposit: number | null; // deposit
  /** 월 임대료(원) */
  monthlyRent: number | null; // monthlyRent
}

/** 단지 */
export interface Complex {
  name: string | null; // name
  address: string | null; // address
  region: Region | null; // region
  housingType: HousingType; // housingType
  households: number | null; // households
  units: UnitType[]; // units
}

/** 공고의 원본 출처 */
export interface NoticeSourceRef {
  source: SourceId; // source
  externalId: string; // externalId
  url: string | null; // url
  /** 원본 응답(디버깅/재파싱용). 직렬화 가능한 값만 담는다. */
  raw: unknown; // raw
  fetchedAt: string; // fetchedAt
}

/** 도메인 interface: Notice. */
export interface Notice {
  id: string; // id
  /** 소스 간 중복 병합 키 */
  mergeKey: string; // mergeKey
  title: string; // title
  organization: string; // organization
  supplyType: SupplyType; // supplyType
  housingTypes: HousingType[]; // housingTypes
  regions: Region[]; // regions
  applicationStart: IsoDate | null; // applicationStart
  applicationEnd: IsoDate | null; // applicationEnd
  announcementDate: IsoDate | null; // announcementDate
  winnerAnnouncementDate: IsoDate | null; // winnerAnnouncementDate
  totalHouseholds: number | null; // totalHouseholds
  /** 자격/신청 안내 발췌(수집 본문, 있으면) */
  eligibilityText: string | null; // eligibilityText
  /** 기관 공고 URL (검증·더 보기) */
  url: string | null; // url
  complexes: Complex[]; // complexes
  sources: NoticeSourceRef[]; // sources
}

/** 소스 어댑터가 만들어내는 입력 (id/mergeKey는 도메인이 부여) */
export type NoticeDraft = Omit<Notice, "id" | "mergeKey">;

/** 접수 상태. 날짜가 모두 없으면 상시모집으로 보고 접수중으로 취급한다. */
export function getNoticeStatus(
  notice: Pick<Notice, "applicationStart" | "applicationEnd">,
  today: IsoDate,
): NoticeStatus {
  const { applicationStart: start, applicationEnd: end } = notice;
  if (end && end < today) return "closed";
  if (start && start > today) return "upcoming";
  return "open";
}

/** 도메인 interface: NoticePriceAreaSummary. */
export interface NoticePriceAreaSummary {
  minDeposit: number | null; // minDeposit
  minMonthlyRent: number | null; // minMonthlyRent
  minAreaM2: number | null; // minAreaM2
  maxAreaM2: number | null; // maxAreaM2
}

/** 도메인 function: summarizeUnits. */
export function summarizeUnits(notice: Pick<Notice, "complexes">): NoticePriceAreaSummary {
  const units = notice.complexes.flatMap((c) => c.units);
  const min = (values: Array<number | null>) => {
    const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
    return nums.length ? Math.min(...nums) : null;
  };
  const max = (values: Array<number | null>) => {
    const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
    return nums.length ? Math.max(...nums) : null;
  };
  return {
    minDeposit: min(units.map((u) => u.deposit)),
    minMonthlyRent: min(units.map((u) => u.monthlyRent)),
    minAreaM2: min(units.map((u) => u.exclusiveAreaM2)),
    maxAreaM2: max(units.map((u) => u.exclusiveAreaM2)),
  };
}
