import { evaluateEligibility, type EligibilityResult, type EligibilityVerdict } from "@/features/housing/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/housing/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { NoticeStatus } from "@/features/housing/domain/enums";
import { getNoticeStatus, type Notice } from "@/features/housing/domain/notice";
import type { Clock } from "@/common/application/system";
import type { NoticeRepository, NoticeSearchQuery, NoticeSort } from "../ports/notice-repository";

/** 목록 검색 필터(today·sort·페이지 제외) */
export type NoticeFilters = Omit<NoticeSearchQuery, "today" | "sort" | "limit" | "offset">;

/** 목록 API·화면 입력 */
export interface SearchNoticesInput {
  filters: NoticeFilters; // 필터
  sort?: NoticeSort; // 정렬
  profile?: ApplicantProfile; // 내 조건
  /** 지정하면 해당 판정 결과의 공고만 남긴다 (profile 필요) */
  verdicts?: EligibilityVerdict[]; // 지정하면 해당 판정 결과의 공고만 남긴다 (profile 필요)
  page?: number; // 1부터
  pageSize?: number; // 건수(상한 100)
}

/** 목록·상세 한 행 */
export interface NoticeListItem {
  notice: Notice; // 공고
  status: NoticeStatus; // 상태
  eligibility: EligibilityResult | null; // 자격 판정 결과
}

/** 페이징 포함 목록 결과 */
export interface SearchNoticesOutput {
  items: NoticeListItem[]; // 결과 목록
  total: number; // 전체 건수
  page: number; // 현재 페이지
  pageSize: number; // 페이지 크기
  totalPages: number; // 전체 페이지 수
}

/** 기본 페이지 크기 */
export const DEFAULT_PAGE_SIZE = 20;

/** 공고 목록 검색·자격 판정(옵션) 유스케이스 */
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
