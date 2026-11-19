import type { ApplicantProfile } from "@/features/benefits/domain/eligibility/applicant";
import { evaluateEligibility, type EligibilityResult } from "@/features/benefits/domain/eligibility/evaluate";
import { todayInKst } from "@/common/domain/date";
import type { BenefitProgram } from "@/features/benefits/domain/program";
import type { Clock } from "@/common/application/system";

/** 이미 조회한 정책 하나에 대해 자격 판정만 수행하는 유스케이스 (클라이언트 API용) */
export class EvaluateEligibility {
  constructor(private readonly clock: Clock) {}

  execute(
    program: Pick<BenefitProgram, "categoryId" | "applicationStart" | "applicationEnd" | "regions">,
    profile: ApplicantProfile,
  ): EligibilityResult {
    return evaluateEligibility(program, profile, todayInKst(this.clock.now()));
  }
}
