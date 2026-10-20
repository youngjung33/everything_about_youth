import { evaluateEligibility, type EligibilityResult, type EligibilityVerdict } from "@/features/housing/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/housing/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { NoticeStatus } from "@/features/housing/domain/enums";
import { getNoticeStatus, type Notice } from "@/features/housing/domain/notice";
import type { Clock } from "@/common/application/system";
import type { NoticeRepository, NoticeSearchQuery, NoticeSort } from "../ports/notice-repository";

export type NoticeFilters = Omit<NoticeSearchQuery, "today" | "sort" | "limit" | "offset">;

export interface SearchNoticesInput {
  filters: NoticeFilters;
  sort?: NoticeSort;
  profile?: ApplicantProfile;
  /** 지정하면 해당 판정 결과의 공고만 남긴다 (profile 필요) */
  verdicts?: EligibilityVerdict[];
  page?: number;
  pageSize?: number;
}

export interface NoticeListItem {
  notice: Notice;
  status: NoticeStatus;
  eligibility: EligibilityResult | null;
}

export interface SearchNoticesOutput {
  items: NoticeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export class SearchNotices {
  constructor(
    private readonly repo: NoticeRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SearchNoticesInput): Promise<SearchNoticesOutput> {
    const today = todayInKst(this.clock.now());
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? "deadline";
    const verdictFilter = input.verdicts && input.verdicts.length > 0 ? new Set(input.verdicts) : null;

    const toItem = (notice: Notice): NoticeListItem => ({
      notice,
      status: getNoticeStatus(notice, today),
      eligibility: input.profile ? evaluateEligibility(notice, input.profile, today) : null,
    });

    const baseQuery: NoticeSearchQuery = { ...input.filters, today, sort };

    // 자격 판정은 도메인 규칙으로 계산하므로 SQL 페이징과 함께 쓸 수 없다.
    // 개인용 데이터 규모(수백~수천 건)를 가정하고 전체를 가져와 메모리에서 필터/페이징한다.
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
