import { evaluateEligibility, type EligibilityResult, type EligibilityVerdict } from "@/features/jobs/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/jobs/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { PostingStatus } from "@/features/jobs/domain/enums";
import { getJobPostingStatus, type JobPosting } from "@/features/jobs/domain/job-posting";
import type { Clock } from "@/common/application/system";
import type { JobPostingRepository, PostingSearchQuery, PostingSort } from "../ports/posting-repository";

/** 목록 검색 필터 */
export type PostingFilters = Omit<PostingSearchQuery, "today" | "sort" | "limit" | "offset">;

/** 목록 검색 입력 */
export interface SearchJobPostingsInput {
  filters: PostingFilters; // 검색 필터
  sort?: PostingSort; // 정렬 기준
  profile?: ApplicantProfile; // 신청자 프로필
  verdicts?: EligibilityVerdict[]; // 자격 판정 필터
  page?: number; // 현재 페이지
  pageSize?: number; // 페이지 크기
}

/** PostingListItem */
export interface PostingListItem {
  program: JobPosting; // 정책
  status: PostingStatus; // 상태
  eligibility: EligibilityResult | null; // 자격 판정 결과
}

/** 페이징 포함 목록 결과 */
export interface SearchJobPostingsOutput {
  items: PostingListItem[]; // 결과 목록
  total: number; // 전체 건수
  page: number; // 현재 페이지
  pageSize: number; // 페이지 크기
  totalPages: number; // 전체 페이지 수
}

/** 기본 페이지 크기 */
export const DEFAULT_PAGE_SIZE = 20;

/** 채용 공고 목록 검색 유스케이스 */
export class SearchJobPostings {
  constructor(
    private readonly repo: JobPostingRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SearchJobPostingsInput): Promise<SearchJobPostingsOutput> {
    const today = todayInKst(this.clock.now());
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? "deadline";
    const verdictFilter = input.verdicts && input.verdicts.length > 0 ? new Set(input.verdicts) : null;

    const toItem = (program: JobPosting): PostingListItem => ({
      program,
      status: getJobPostingStatus(program, today),
      eligibility: input.profile ? evaluateEligibility(program, input.profile, today) : null,
    });

    const baseQuery: PostingSearchQuery = { ...input.filters, today, sort };

    if (verdictFilter && input.profile) {
      const { items } = await this.repo.search(baseQuery);
      const filtered = items.map(toItem).filter((i) => i.eligibility && verdictFilter.has(i.eligibility.verdict));
      const total = filtered.length;
      return {
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }

    const { items, total } = await this.repo.search({ ...baseQuery, limit: pageSize, offset: (page - 1) * pageSize });
    return {
      items: items.map(toItem),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
