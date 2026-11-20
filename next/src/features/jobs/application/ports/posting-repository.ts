import type { IsoDate } from "@/common/domain/date";
import type { HireTypeId, PostingStatus } from "@/features/jobs/domain/enums";
import type { JobPosting } from "@/features/jobs/domain/job-posting";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 기준 */
export type PostingSort = "deadline" | "latest";

/** 채용 공고 검색 조건 */
export interface PostingSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate; // 상태 계산 기준일
  sidos?: Sido[]; // 시·도 필터
  sigungu?: string; // 시·군·구 필터
  hireTypeIds?: HireTypeId[]; // hireTypeIds
  tags?: string[]; // 태그 필터
  /** 비어 있으면 모집중+모집예정 */
  statuses?: PostingStatus[]; // 비어 있으면 모집중+모집예정
  keyword?: string; // 검색어
  sort: PostingSort; // 정렬 기준
  /** 생략하면 전체 반환 */
  limit?: number; // 생략하면 전체 반환
  offset?: number; // 건너뛸 건수
}

/** 채용 공고 검색 결과 */
export interface PostingSearchResult {
  items: JobPosting[]; // 결과 목록
  /** limit/offset 적용 전 전체 건수 */
  total: number; // limit/offset 적용 전 전체 건수
}

/** 대량 upsert 집계 */
export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 채용 공고 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface JobPostingRepository {
  search(query: PostingSearchQuery): Promise<PostingSearchResult>; // 조건으로 검색
  findById(id: string): Promise<JobPosting | null>; // id로 단건 조회
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 공고를 반환한다. */
  findExistingFor(incoming: JobPosting[]): Promise<JobPosting[]>; // incoming 과 병합키 또는 소스 외부ID가 같은 기존 공고를 반환한다
  upsertMany(postings: JobPosting[]): Promise<UpsertResult>; // 대량 upsert
}
