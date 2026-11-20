import type { IsoDate } from "@/common/domain/date";
import type { ProductTypeId, SchemeStatus, SourceId } from "./enums";
import type { Region } from "@/common/domain/region";

/** 프로그램의 원본 출처 */
export interface SchemeSourceRef {
  source: SourceId; // source
  externalId: string; // externalId
  url: string | null; // url
  raw: unknown; // raw
  fetchedAt: string; // fetchedAt
}

/** 금융·자금 지원 상품(정책) 엔티티 */
export interface FinanceScheme {
  id: string; // id
  mergeKey: string; // 중복 병합 키
  title: string; // title
  organization: string; // organization
  productTypeId: ProductTypeId; // productTypeId
  /** 검색·필터용 키워드 태그 */
  tags: string[]; // tags
  regions: Region[]; // regions
  applicationStart: IsoDate | null; // applicationStart
  applicationEnd: IsoDate | null; // applicationEnd
  announcementDate: IsoDate | null; // announcementDate
  /** 지원 내용·자격 요약 */
  summary: string | null; // summary
  /** 신청·상세 안내 URL */
  url: string | null; // url
  sources: SchemeSourceRef[]; // sources
}

/** 수집 직후 id·mergeKey 가 없는 초안 */
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
