import type { IsoDate } from "@/common/domain/date";
import type { ProductTypeId, SchemeStatus } from "@/features/finance/domain/enums";
import type { FinanceScheme } from "@/features/finance/domain/scheme";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 기준 */
export type SchemeSort = "deadline" | "latest";

export interface SchemeSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  productTypeIds?: ProductTypeId[];
  tags?: string[];
  /** 비어 있으면 신청중+신청예정 */
  statuses?: SchemeStatus[];
  keyword?: string;
  sort: SchemeSort;
  /** 생략하면 전체 반환 */
  limit?: number;
  offset?: number;
}

export interface SchemeSearchResult {
  items: FinanceScheme[];
  /** limit/offset 적용 전 전체 건수 */
  total: number;
}

export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 금융·자금 상품 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface SchemeRepository {
  search(query: SchemeSearchQuery): Promise<SchemeSearchResult>;
  findById(id: string): Promise<FinanceScheme | null>;
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 상품을 반환한다. */
  findExistingFor(incoming: FinanceScheme[]): Promise<FinanceScheme[]>;
  upsertMany(schemes: FinanceScheme[]): Promise<UpsertResult>;
}
