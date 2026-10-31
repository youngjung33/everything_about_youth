import { evaluateEligibility, type EligibilityResult, type EligibilityVerdict } from "@/features/benefits/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/benefits/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { ProgramStatus } from "@/features/benefits/domain/enums";
import { getProgramStatus, type BenefitProgram } from "@/features/benefits/domain/program";
import type { Clock } from "@/common/application/system";
import type { ProgramRepository, ProgramSearchQuery, ProgramSort } from "../ports/program-repository";

export type ProgramFilters = Omit<ProgramSearchQuery, "today" | "sort" | "limit" | "offset">;

export interface SearchProgramsInput {
  filters: ProgramFilters;
  sort?: ProgramSort;
  profile?: ApplicantProfile;
  verdicts?: EligibilityVerdict[];
  page?: number;
  pageSize?: number;
}

export interface ProgramListItem {
  program: BenefitProgram;
  status: ProgramStatus;
  eligibility: EligibilityResult | null;
}

export interface SearchProgramsOutput {
  items: ProgramListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export class SearchPrograms {
  constructor(
    private readonly repo: ProgramRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: SearchProgramsInput): Promise<SearchProgramsOutput> {
    const today = todayInKst(this.clock.now());
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE));
    const sort = input.sort ?? "deadline";
    const verdictFilter = input.verdicts && input.verdicts.length > 0 ? new Set(input.verdicts) : null;

    const toItem = (program: BenefitProgram): ProgramListItem => ({
      program,
      status: getProgramStatus(program, today),
      eligibility: input.profile ? evaluateEligibility(program, input.profile, today) : null,
    });

    const baseQuery: ProgramSearchQuery = { ...input.filters, today, sort };

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
