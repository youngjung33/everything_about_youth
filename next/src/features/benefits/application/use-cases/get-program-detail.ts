import type { ApplicantProfile } from "@/features/benefits/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import { getProgramStatus } from "@/features/benefits/domain/program";
import type { ProgramListItem } from "./search-programs";
import { evaluateEligibility } from "@/features/benefits/domain/eligibility/evaluate";
import type { ProgramRepository } from "../ports/program-repository";
import type { Clock } from "@/common/application/system";

/** 정책 단건 조회. profile 이 있으면 자격 판정을 포함한다. */
export class GetProgramDetail {
  constructor(
    private readonly repo: ProgramRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, profile?: ApplicantProfile): Promise<ProgramListItem | null> {
    const program = await this.repo.findById(id);
    if (!program) return null;
    const today = todayInKst(this.clock.now());
    return {
      program,
      status: getProgramStatus(program, today),
      eligibility: profile ? evaluateEligibility(program, profile, today) : null,
    };
  }
}
