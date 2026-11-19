import type { ApplicantProfile } from "@/features/living/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import { getGuideStatus } from "@/features/living/domain/guide";
import { evaluateEligibility } from "@/features/living/domain/eligibility/evaluate";
import type { GuideListItem } from "./search-guides";
import type { GuideRepository } from "../ports/guide-repository";
import type { Clock } from "@/common/application/system";

/** ID 로 생활·행정 안내 한 건을 조회하고, 필요 시 자격 판정을 붙인다. */
export class GetGuideDetail {
  constructor(
    private readonly repo: GuideRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, profile?: ApplicantProfile): Promise<GuideListItem | null> {
    const program = await this.repo.findById(id);
    if (!program) return null;
    const today = todayInKst(this.clock.now());
    return {
      program,
      status: getGuideStatus(program, today),
      eligibility: profile ? evaluateEligibility(program, profile, today) : null,
    };
  }
}