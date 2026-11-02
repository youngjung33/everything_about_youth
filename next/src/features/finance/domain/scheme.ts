import type { IsoDate } from "@/common/domain/date";
import type { ProductTypeId, SchemeStatus, SourceId } from "./enums";
import type { Region } from "@/common/domain/region";

/** 프로그램의 원본 출처 */
export interface SchemeSourceRef {
  source: SourceId;
  externalId: string;
  url: string | null;
  raw: unknown;
  fetchedAt: string;
}

export interface FinanceScheme {
  id: string;
  mergeKey: string;
  title: string;
  organization: string;
  productTypeId: ProductTypeId;
  /** 검색·필터용 키워드 태그 */
  tags: string[];
  regions: Region[];
  applicationStart: IsoDate | null;
  applicationEnd: IsoDate | null;
  announcementDate: IsoDate | null;
  /** 지원 내용·자격 요약 */
  summary: string | null;
  /** 신청·상세 안내 URL */
  url: string | null;
  sources: SchemeSourceRef[];
}

export type FinanceSchemeDraft = Omit<FinanceScheme, "id" | "mergeKey">;

/** 접수 상태. 날짜가 모두 없으면 상시모집으로 보고 신청중으로 취급한다. */
export function getSchemeStatus(
  program: Pick<FinanceScheme, "applicationStart" | "applicationEnd">,
  today: IsoDate,
): SchemeStatus {
  const { applicationStart: start, applicationEnd: end } = program;
  if (end && end < today) return "closed";
  if (start && start > today) return "upcoming";
  return "open";
}
