import { getProgramStatus, type BenefitProgram } from "@/features/benefits/domain/program";
import { evaluateEligibility } from "@/features/benefits/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/benefits/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { Clock } from "@/common/application/system";
import type { ProgramRepository } from "../ports/program-repository";
import type { SavedProgramRepository } from "../ports/saved-program-repository";
import type { ProgramListItem } from "./search-programs";

export const MAX_SAVED_PROGRAMS = 100;

export type SaveProgramResult = { status: "saved" } | { status: "already" } | { status: "not_found" } | { status: "limit"; max: number };

export class ManageSavedPrograms {
  constructor(
    private readonly saved: SavedProgramRepository,
    private readonly programs: ProgramRepository,
    private readonly clock: Clock,
  ) {}

  async save(userId: string, programId: string): Promise<SaveProgramResult> {
    if (await this.saved.isSaved(userId, programId)) return { status: "already" };
    if (!(await this.programs.findById(programId))) return { status: "not_found" };
    if ((await this.saved.count(userId)) >= MAX_SAVED_PROGRAMS) return { status: "limit", max: MAX_SAVED_PROGRAMS };
    await this.saved.save(userId, programId, this.clock.now().toISOString());
    return { status: "saved" };
  }

  async unsave(userId: string, programId: string): Promise<void> {
    await this.saved.remove(userId, programId);
  }

  async listIds(userId: string): Promise<string[]> {
    return (await this.saved.list(userId)).map((s) => s.programId);
  }

  async list(userId: string, profile?: ApplicantProfile): Promise<ProgramListItem[]> {
    const today = todayInKst(this.clock.now());
    const items: ProgramListItem[] = [];
    for (const row of await this.saved.list(userId)) {
      const program = await this.programs.findById(row.programId);
      if (!program) continue;
      items.push(toItem(program, today, profile));
    }
    return items;
  }

  async merge(userId: string, programIds: string[]): Promise<string[]> {
    const unique = [...new Set(programIds.map((id) => id.trim()).filter(Boolean))];
    for (const id of unique) {
      const result = await this.save(userId, id);
      if (result.status === "limit") break;
    }
    return this.listIds(userId);
  }
}

function toItem(program: BenefitProgram, today: string, profile?: ApplicantProfile): ProgramListItem {
  return {
    program,
    status: getProgramStatus(program, today),
    eligibility: profile ? evaluateEligibility(program, profile, today) : null,
  };
}
