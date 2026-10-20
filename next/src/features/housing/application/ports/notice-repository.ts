import type { IsoDate } from "@/common/domain/date";
import type { HousingType, NoticeStatus, SupplyType } from "@/features/housing/domain/enums";
import type { Notice } from "@/features/housing/domain/notice";
import type { Sido } from "@/common/domain/region";

export type NoticeSort = "deadline" | "latest";

export interface NoticeSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  supplyTypes?: SupplyType[];
  housingTypes?: HousingType[];
  /** 비어 있으면 접수중+접수예정 */
  statuses?: NoticeStatus[];
  /** 최소 보증금(분양가)이 이 값 이하인 공고. 금액 미상 공고는 포함 */
  maxDeposit?: number;
  maxMonthlyRent?: number;
  /** 전용면적 범위(㎡)와 겹치는 공고 */
  minAreaM2?: number;
  maxAreaM2?: number;
  keyword?: string;
  sort: NoticeSort;
  /** 생략하면 전체 반환 */
  limit?: number;
  offset?: number;
}

export interface NoticeSearchResult {
  items: Notice[];
  /** limit/offset 적용 전 전체 건수 */
  total: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

/** 공고 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface NoticeRepository {
  search(query: NoticeSearchQuery): Promise<NoticeSearchResult>;
  findById(id: string): Promise<Notice | null>;
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 공고들을 반환한다. */
  findExistingFor(incoming: Notice[]): Promise<Notice[]>;
  upsertMany(notices: Notice[]): Promise<UpsertResult>;
}
