import type { ApplicantProfile } from "@/features/jobs/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import { getJobPostingStatus } from "@/features/jobs/domain/job-posting";
import type { PostingListItem } from "./search-job-postings";
import { evaluateEligibility } from "@/features/jobs/domain/eligibility/evaluate";
import type { JobPostingRepository } from "../ports/posting-repository";
import type { Clock } from "@/common/application/system";

/** ID 로 채용 공고 한 건을 조회하고, 필요 시 자격 판정을 붙인다. */
export class GetJobPostingDetail {
  constructor(
    private readonly repo: JobPostingRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, profile?: ApplicantProfile): Promise<PostingListItem | null> {
    const program = await this.repo.findById(id);
    if (!program) return null;
    const today = todayInKst(this.clock.now());
    return {
      program,
      status: getJobPostingStatus(program, today),
      eligibility: profile ? evaluateEligibility(program, profile, today) : null,
    };
  }
}
