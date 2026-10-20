import type { ApplicantProfile } from "@/features/housing/domain/eligibility/applicant";
import { evaluateEligibility, type EligibilityResult } from "@/features/housing/domain/eligibility/evaluate";
import { todayInKst } from "@/common/domain/date";
import type { Notice } from "@/features/housing/domain/notice";
import type { Clock } from "@/common/application/system";

/** 이미 조회한 공고 하나에 대해 자격 판정만 수행하는 유스케이스 (클라이언트 'API'용) */
export class EvaluateEligibility {
  constructor(private readonly clock: Clock) {}

  execute(notice: Pick<Notice, "supplyType" | "applicationStart" | "applicationEnd">, profile: ApplicantProfile): EligibilityResult {
    return evaluateEligibility(notice, profile, todayInKst(this.clock.now()));
  }
}
