import { evaluateEligibility, type EligibilityResult, type EligibilityVerdict } from "@/features/finance/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/finance/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { SchemeStatus } from "@/features/finance/domain/enums";
import { getSchemeStatus, type FinanceScheme } from "@/features/finance/domain/scheme";
import type { Clock } from "@/common/application/system";
import type { SchemeRepository, SchemeSearchQuery, SchemeSort } from "../ports/scheme-repository";

/** 저장소 검색 쿼리에서 페이징·정렬·기준일을 뺀 필터 묶음 */
export type SchemeFilters = Omit<SchemeSearchQuery, "today" | "sort" | "limit" | "offset">;

export interface SearchSchemesInput {
  filters: SchemeFilters;
  sort?: SchemeSort;
  profile?: ApplicantProfile;
  /** 지정하면 해당 판정 결과의 상품만 남긴다 (profile 필요) */
  verdicts?: EligibilityVerdict[];
  page?: number;
  pageSize?: number;
}

export interface SchemeListItem {
  program: FinanceScheme;
  status: SchemeStatus;
  eligibility: EligibilityResult | null;
}

export interface SearchSchemesOutput {
  items: SchemeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 기본 페이지 크기 */
export const DEFAULT_PAGE_SIZE = 20;

/** 금융·자금 상품 목록 검색·필터·(선택)자격 판정 */
export class SearchSchemes {
  constructor(
    private readonly repo: SchemeRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SearchSchemesInput): Promise<SearchSchemesOutput> {
    const today = todayInKst(this.clock.now());
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? "deadline";
    const verdictFilter = input.verdicts && input.verdicts.length > 0 ? new Set(input.verdicts) : null;

    const toItem = (program: FinanceScheme): SchemeListItem => ({
      program,
      status: getSchemeStatus(program, today),
      eligibility: input.profile ? evaluateEligibility(program, input.profile, today) : null,
    });

    const baseQuery: SchemeSearchQuery = { ...input.filters, today, sort };

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
