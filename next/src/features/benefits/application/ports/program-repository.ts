import type { IsoDate } from "@/common/domain/date";
import type { CategoryId, ProgramStatus } from "@/features/benefits/domain/enums";
import type { BenefitProgram } from "@/features/benefits/domain/program";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 */
export type ProgramSort = "deadline" | "latest";

/** 저장소 검색 조건 */
export interface ProgramSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate; // 상태 계산 기준일
  sidos?: Sido[]; // 시·도 필터
  sigungu?: string; // 시·군·구 필터
  categoryIds?: CategoryId[]; // 카테고리 필터
  tags?: string[]; // 태그 필터
  /** 비어 있으면 접수중+접수예정 */
  statuses?: ProgramStatus[]; // 비어 있으면 접수중+접수예정
  keyword?: string; // 검색어
  sort: ProgramSort; // 정렬 기준
  /** 생략하면 전체 반환 */
  limit?: number; // 생략하면 전체 반환
  offset?: number; // 건너뛸 건수
}

/** 검색 결과 */
export interface ProgramSearchResult {
  items: BenefitProgram[]; // 결과 목록
  /** limit/offset 적용 전 전체 건수 */
  total: number; // limit/offset 적용 전 전체 건수
}

/** 대량 upsert 집계 */
export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 정책 저장소 포트. 1차 SQLite, 2차 Postgres 로 구현체만 교체 */
export interface ProgramRepository {
  search(query: ProgramSearchQuery): Promise<ProgramSearchResult>; // 조건으로 검색
  findById(id: string): Promise<BenefitProgram | null>; // id로 단건 조회
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 정책들 */
  findExistingFor(incoming: BenefitProgram[]): Promise<BenefitProgram[]>; // incoming 과 병합키 또는 소스 외부ID가 같은 기존 정책들
  upsertMany(programs: BenefitProgram[]): Promise<UpsertResult>; // 대량 upsert
}
