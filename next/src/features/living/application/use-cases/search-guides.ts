import { todayInKst } from "@/common/domain/date";
import type { GuideStatus } from "@/features/living/domain/enums";
import { getGuideStatus, type LivingGuide } from "@/features/living/domain/guide";
import type { Clock } from "@/common/application/system";
import type { GuideRepository, GuideSearchQuery, GuideSort } from "../ports/guide-repository";

export type GuideFilters = Omit<GuideSearchQuery, "today" | "sort" | "limit" | "offset">;

export interface SearchGuidesInput {
  filters: GuideFilters;
  sort?: GuideSort;
  page?: number;
  pageSize?: number;
}

export interface GuideListItem {
  program: LivingGuide;
  status: GuideStatus;
  eligibility: null;
}

export interface SearchGuidesOutput {
  items: GuideListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export class SearchGuides {
  constructor(
    private readonly repo: GuideRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SearchGuidesInput): Promise<SearchGuidesOutput> {
    const today = todayInKst(this.clock.now());
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? "deadline";

    const toItem = (program: LivingGuide): GuideListItem => ({
      program,
      status: getGuideStatus(program, today),
      eligibility: null,
    });

    const baseQuery: GuideSearchQuery = { ...input.filters, today, sort };

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
