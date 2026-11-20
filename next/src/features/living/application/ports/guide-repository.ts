import type { IsoDate } from "@/common/domain/date";
import type { ProcedureTypeId, GuideStatus } from "@/features/living/domain/enums";
import type { LivingGuide } from "@/features/living/domain/guide";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 기준 */
export type GuideSort = "deadline" | "latest";

/** 안내 검색 조건 */
export interface GuideSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate; // 상태 계산 기준일
  sidos?: Sido[]; // 시·도 필터
  sigungu?: string; // 시·군·구 필터
  procedureTypeIds?: ProcedureTypeId[]; // 절차 유형 필터
  tags?: string[]; // 태그 필터
  /** 비어 있으면 안내중+안내예정 */
  statuses?: GuideStatus[]; // 비어 있으면 안내중+안내예정
  keyword?: string; // 검색어
  sort: GuideSort; // 정렬 기준
  /** 생략하면 전체 반환 */
  limit?: number; // 생략하면 전체 반환
  offset?: number; // 건너뛸 건수
}

/** 안내 검색 결과 */
export interface GuideSearchResult {
  items: LivingGuide[]; // 결과 목록
  /** limit/offset 적용 전 전체 건수 */
  total: number; // limit/offset 적용 전 전체 건수
}

/** 대량 upsert 집계 */
export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 생활·행정 안내 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface GuideRepository {
  search(query: GuideSearchQuery): Promise<GuideSearchResult>; // 조건으로 검색
  findById(id: string): Promise<LivingGuide | null>; // id로 단건 조회
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 안내를 반환한다. */
  findExistingFor(incoming: LivingGuide[]): Promise<LivingGuide[]>; // incoming 과 병합키 또는 소스 외부ID가 같은 기존 안내를 반환한다
  upsertMany(guides: LivingGuide[]): Promise<UpsertResult>; // 대량 upsert
}
