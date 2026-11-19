import type { ApplicantProfile } from "@/features/finance/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import { getSchemeStatus } from "@/features/finance/domain/scheme";
import type { SchemeListItem } from "./search-schemes";
import { evaluateEligibility } from "@/features/finance/domain/eligibility/evaluate";
import type { SchemeRepository } from "../ports/scheme-repository";
import type { Clock } from "@/common/application/system";

/** ID 로 금융·자금 상품 한 건을 조회하고, 필요 시 자격 판정을 붙인다. */
export class GetSchemeDetail {
  constructor(
    private readonly repo: SchemeRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, profile?: ApplicantProfile): Promise<SchemeListItem | null> {
    const program = await this.repo.findById(id);
    if (!program) return null;
    const today = todayInKst(this.clock.now());
    return {
      program,
      status: getSchemeStatus(program, today),
      eligibility: profile ? evaluateEligibility(program, profile, today) : null,
    };
  }
}
