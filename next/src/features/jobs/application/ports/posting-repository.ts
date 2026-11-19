import type { IsoDate } from "@/common/domain/date";
import type { HireTypeId, PostingStatus } from "@/features/jobs/domain/enums";
import type { JobPosting } from "@/features/jobs/domain/job-posting";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 기준 */
export type PostingSort = "deadline" | "latest";

export interface PostingSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  hireTypeIds?: HireTypeId[];
  tags?: string[];
  /** 비어 있으면 모집중+모집예정 */
  statuses?: PostingStatus[];
  keyword?: string;
  sort: PostingSort;
  /** 생략하면 전체 반환 */
  limit?: number;
  offset?: number;
}

export interface PostingSearchResult {
  items: JobPosting[];
  /** limit/offset 적용 전 전체 건수 */
  total: number;
}

export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 채용 공고 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface JobPostingRepository {
  search(query: PostingSearchQuery): Promise<PostingSearchResult>;
  findById(id: string): Promise<JobPosting | null>;
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 공고를 반환한다. */
  findExistingFor(incoming: JobPosting[]): Promise<JobPosting[]>;
  upsertMany(postings: JobPosting[]): Promise<UpsertResult>;
}