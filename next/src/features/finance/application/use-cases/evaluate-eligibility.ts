import type { ApplicantProfile } from "@/features/finance/domain/eligibility/applicant";
import { evaluateEligibility, type EligibilityResult } from "@/features/finance/domain/eligibility/evaluate";
import { todayInKst } from "@/common/domain/date";
import type { FinanceScheme } from "@/features/finance/domain/scheme";
import type { Clock } from "@/common/application/system";

export class EvaluateEligibility {
  constructor(private readonly clock: Clock) {}

  execute(
    program: Pick<FinanceScheme, "productTypeId" | "applicationStart" | "applicationEnd" | "regions">,
    profile: ApplicantProfile,
  ): EligibilityResult {
    return evaluateEligibility(program, profile, todayInKst(this.clock.now()));
  }
}
