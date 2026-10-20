import type { IsoDate } from "@/common/domain/date";
import type { HousingType, NoticeStatus, SourceId, SupplyType } from "./enums";
import type { Region } from "@/common/domain/region";

/** 세대(평형) 유형. 금액은 원 단위. */
export interface UnitType {
  name: string | null;
  /** 전용면적(㎡) */
  exclusiveAreaM2: number | null;
  households: number | null;
  /** 임대보증금 또는 분양가(원) */
  deposit: number | null;
  /** 월 임대료(원) */
  monthlyRent: number | null;
}

/** 단지 */
export interface Complex {
  name: string | null;
  address: string | null;
  region: Region | null;
  housingType: HousingType;
  households: number | null;
  units: UnitType[];
}

/** 공고의 원본 출처 */
export interface NoticeSourceRef {
  source: SourceId;
  externalId: string;
  url: string | null;
  /** 원본 응답(디버깅/재파싱용). 직렬화 가능한 값만 담는다. */
  raw: unknown;
  fetchedAt: string;
}

export interface Notice {
  id: string;
  /** 소스 간 중복 병합 키 */
  mergeKey: string;
  title: string;
  organization: string;
  supplyType: SupplyType;
  housingTypes: HousingType[];
  regions: Region[];
  applicationStart: IsoDate | null;
  applicationEnd: IsoDate | null;
  announcementDate: IsoDate | null;
  winnerAnnouncementDate: IsoDate | null;
  totalHouseholds: number | null;
  /** 자격/신청 안내 원문 요약(있으면) */
  eligibilityText: string | null;
  /** 대표 원문 공고 URL */
  url: string | null;
  complexes: Complex[];
  sources: NoticeSourceRef[];
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

export interface NoticePriceAreaSummary {
  minDeposit: number | null;
  minMonthlyRent: number | null;
  minAreaM2: number | null;
  maxAreaM2: number | null;
}

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
