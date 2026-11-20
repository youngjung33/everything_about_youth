import type { IsoDate } from "@/common/domain/date";
import type { ProductTypeId, SchemeStatus } from "@/features/finance/domain/enums";
import type { FinanceScheme } from "@/features/finance/domain/scheme";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 기준 */
export type SchemeSort = "deadline" | "latest";

/** 금융 상품 검색 조건 */
export interface SchemeSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate; // 상태 계산 기준일
  sidos?: Sido[]; // 시·도 필터
  sigungu?: string; // 시·군·구 필터
  productTypeIds?: ProductTypeId[]; // productTypeIds
  tags?: string[]; // 태그 필터
  /** 비어 있으면 신청중+신청예정 */
  statuses?: SchemeStatus[]; // 비어 있으면 신청중+신청예정
  keyword?: string; // 검색어
  sort: SchemeSort; // 정렬 기준
  /** 생략하면 전체 반환 */
  limit?: number; // 생략하면 전체 반환
  offset?: number; // 건너뛸 건수
}

/** 금융 상품 검색 결과 */
export interface SchemeSearchResult {
  items: FinanceScheme[]; // 결과 목록
  /** limit/offset 적용 전 전체 건수 */
  total: number; // limit/offset 적용 전 전체 건수
}

/** 대량 upsert 집계 */
export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 금융·자금 상품 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface SchemeRepository {
  search(query: SchemeSearchQuery): Promise<SchemeSearchResult>; // 조건으로 검색
  findById(id: string): Promise<FinanceScheme | null>; // id로 단건 조회
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 상품을 반환한다. */
  findExistingFor(incoming: FinanceScheme[]): Promise<FinanceScheme[]>; // incoming 과 병합키 또는 소스 외부ID가 같은 기존 상품을 반환한다
  upsertMany(schemes: FinanceScheme[]): Promise<UpsertResult>; // 대량 upsert
}
