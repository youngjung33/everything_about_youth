import { evaluateEligibility, type EligibilityResult, type EligibilityVerdict } from "@/features/jobs/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/jobs/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { PostingStatus } from "@/features/jobs/domain/enums";
import { getJobPostingStatus, type JobPosting } from "@/features/jobs/domain/job-posting";
import type { Clock } from "@/common/application/system";
import type { JobPostingRepository, PostingSearchQuery, PostingSort } from "../ports/posting-repository";

export type PostingFilters = Omit<PostingSearchQuery, "today" | "sort" | "limit" | "offset">;

export interface SearchJobPostingsInput {
  filters: PostingFilters;
  sort?: PostingSort;
  profile?: ApplicantProfile;
  verdicts?: EligibilityVerdict[];
  page?: number;
  pageSize?: number;
}

export interface PostingListItem {
  program: JobPosting;
  status: PostingStatus;
  eligibility: EligibilityResult | null;
}

export interface SearchJobPostingsOutput {
  items: PostingListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;

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
