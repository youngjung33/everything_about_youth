import type { IsoDate } from "@/common/domain/date";
import type { CategoryId, ProgramStatus } from "@/features/benefits/domain/enums";
import type { BenefitProgram } from "@/features/benefits/domain/program";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 */
export type ProgramSort = "deadline" | "latest";

/** 저장소 검색 조건 */
export interface ProgramSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  categoryIds?: CategoryId[];
  tags?: string[];
  /** 비어 있으면 접수중+접수예정 */
  statuses?: ProgramStatus[];
  keyword?: string;
  sort: ProgramSort;
  /** 생략하면 전체 반환 */
  limit?: number;
  offset?: number;
}

/** 검색 결과 */
export interface ProgramSearchResult {
  items: BenefitProgram[];
  /** limit/offset 적용 전 전체 건수 */
  total: number;
}

/** 대량 upsert 집계 */
export interface UpsertResult {
  inserted: number;
  updated: number;
}

/** 정책 저장소 포트. 1차 SQLite, 2차 Postgres 로 구현체만 교체 */
export interface ProgramRepository {
  search(query: ProgramSearchQuery): Promise<ProgramSearchResult>;
  findById(id: string): Promise<BenefitProgram | null>;
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 정책들 */
  findExistingFor(incoming: BenefitProgram[]): Promise<BenefitProgram[]>;
  upsertMany(programs: BenefitProgram[]): Promise<UpsertResult>;
}
