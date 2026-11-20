import type { IsoDate } from "@/common/domain/date";
import type { HousingType, NoticeStatus, SupplyType } from "@/features/housing/domain/enums";
import type { Notice } from "@/features/housing/domain/notice";
import type { Sido } from "@/common/domain/region";

/** 공고 목록 정렬 */
export type NoticeSort = "deadline" | "latest";

/** 공고 검색 조건 */
export interface NoticeSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate; // 상태 계산 기준일
  sidos?: Sido[]; // 시·도 필터
  sigungu?: string; // 시·군·구 필터
  supplyTypes?: SupplyType[]; // 공급 유형 필터
  housingTypes?: HousingType[]; // 주택 유형 필터
  /** 비어 있으면 접수중+접수예정 */
  statuses?: NoticeStatus[]; // 비어 있으면 접수중+접수예정
  /** 최소 보증금(분양가)이 이 값 이하인 공고. 금액 미상 공고는 포함 */
  maxDeposit?: number; // 최소 보증금(분양가)이 이 값 이하인 공고. 금액 미상 공고는 포함
  maxMonthlyRent?: number; // 최대 월세 상한
  /** 전용면적 범위(㎡)와 겹치는 공고 */
  minAreaM2?: number; // 전용면적 범위(㎡)와 겹치는 공고
  maxAreaM2?: number; // 최대 전용면적(㎡)
  keyword?: string; // 검색어
  sort: NoticeSort; // 정렬 기준
  /** 생략하면 전체 반환 */
  limit?: number; // 생략하면 전체 반환
  offset?: number; // 건너뛸 건수
}

/** 공고 검색 결과 */
export interface NoticeSearchResult {
  items: Notice[]; // 결과 목록
  /** limit/offset 적용 전 전체 건수 */
  total: number; // limit/offset 적용 전 전체 건수
}

/** 대량 upsert 집계 */
export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 공고 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface NoticeRepository {
  search(query: NoticeSearchQuery): Promise<NoticeSearchResult>; // 조건으로 검색
  findById(id: string): Promise<Notice | null>; // id로 단건 조회
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 공고들을 반환한다. */
  findExistingFor(incoming: Notice[]): Promise<Notice[]>; // incoming 과 병합키 또는 소스 외부ID가 같은 기존 공고들을 반환한다
  upsertMany(notices: Notice[]): Promise<UpsertResult>; // 대량 upsert
}
