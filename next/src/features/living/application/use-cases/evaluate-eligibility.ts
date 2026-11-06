import type { ApplicantProfile } from "@/features/living/domain/eligibility/applicant";
import { evaluateEligibility, type EligibilityResult } from "@/features/living/domain/eligibility/evaluate";
import { todayInKst } from "@/common/domain/date";
import type { LivingGuide } from "@/features/living/domain/guide";
import type { Clock } from "@/common/application/system";

export class EvaluateEligibility {
  constructor(private readonly clock: Clock) {}

  execute(
    program: Pick<LivingGuide, "procedureTypeId" | "applicationStart" | "applicationEnd" | "regions">,
    profile: ApplicantProfile,
  ): EligibilityResult {
    return evaluateEligibility(program, profile, todayInKst(this.clock.now()));
  }
}
