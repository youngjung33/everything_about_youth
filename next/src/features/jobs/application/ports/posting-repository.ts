import type { IsoDate } from "@/common/domain/date";
import type { HireTypeId, PostingStatus } from "@/features/jobs/domain/enums";
import type { JobPosting } from "@/features/jobs/domain/job-posting";
import type { Sido } from "@/common/domain/region";

export type PostingSort = "deadline" | "latest";

export interface PostingSearchQuery {
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  hireTypeIds?: HireTypeId[];
  tags?: string[];
  statuses?: PostingStatus[];
  keyword?: string;
  sort: PostingSort;
  limit?: number;
  offset?: number;
}

export interface PostingSearchResult {
  items: JobPosting[];
  total: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

export interface JobPostingRepository {
  search(query: PostingSearchQuery): Promise<PostingSearchResult>;
  findById(id: string): Promise<JobPosting | null>;
  findExistingFor(incoming: JobPosting[]): Promise<JobPosting[]>;
  upsertMany(postings: JobPosting[]): Promise<UpsertResult>;
}
