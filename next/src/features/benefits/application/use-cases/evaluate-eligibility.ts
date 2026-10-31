import type { ApplicantProfile } from "@/features/benefits/domain/eligibility/applicant";
import { evaluateEligibility, type EligibilityResult } from "@/features/benefits/domain/eligibility/evaluate";
import { todayInKst } from "@/common/domain/date";
import type { BenefitProgram } from "@/features/benefits/domain/program";
import type { Clock } from "@/common/application/system";

export class EvaluateEligibility {
  constructor(private readonly clock: Clock) {}

  execute(
    program: Pick<BenefitProgram, "categoryId" | "applicationStart" | "applicationEnd" | "regions">,
    profile: ApplicantProfile,
  ): EligibilityResult {
    return evaluateEligibility(program, profile, todayInKst(this.clock.now()));
  }
}
