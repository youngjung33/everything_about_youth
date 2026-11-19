import type { ApplicantProfile } from "@/features/jobs/domain/eligibility/applicant";
import { evaluateEligibility, type EligibilityResult } from "@/features/jobs/domain/eligibility/evaluate";
import { todayInKst } from "@/common/domain/date";
import type { JobPosting } from "@/features/jobs/domain/job-posting";
import type { Clock } from "@/common/application/system";

/** 이미 조회한 채용 공고 하나에 대해 자격 판정만 수행하는 유스케이스 (클라이언트 'API'용) */
export class EvaluateEligibility {
  constructor(private readonly clock: Clock) {}

  execute(
    program: Pick<JobPosting, "hireTypeId" | "applicationStart" | "applicationEnd" | "regions">,
    profile: ApplicantProfile,
  ): EligibilityResult {
    return evaluateEligibility(program, profile, todayInKst(this.clock.now()));
  }
}
