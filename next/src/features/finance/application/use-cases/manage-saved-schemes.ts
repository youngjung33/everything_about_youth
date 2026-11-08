import { getSchemeStatus, type FinanceScheme } from "@/features/finance/domain/scheme";
import { evaluateEligibility } from "@/features/finance/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/finance/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { Clock } from "@/common/application/system";
import type { SchemeRepository } from "../ports/scheme-repository";
import type { SavedSchemeRepository } from "../ports/saved-scheme-repository";
import type { SchemeListItem } from "./search-schemes";

export const MAX_SAVED_PROGRAMS = 100;

export type SaveSchemeResult = { status: "saved" } | { status: "already" } | { status: "not_found" } | { status: "limit"; max: number };

export class ManageSavedSchemes {
  constructor(
    private readonly saved: SavedSchemeRepository,
    private readonly schemes: SchemeRepository,
    private readonly clock: Clock,
  ) {}

  async save(userId: string, schemeId: string): Promise<SaveSchemeResult> {
    if (await this.saved.isSaved(userId, schemeId)) return { status: "already" };
    if (!(await this.schemes.findById(schemeId))) return { status: "not_found" };
    if ((await this.saved.count(userId)) >= MAX_SAVED_PROGRAMS) return { status: "limit", max: MAX_SAVED_PROGRAMS };
    await this.saved.save(userId, schemeId, this.clock.now().toISOString());
    return { status: "saved" };
  }

  async unsave(userId: string, schemeId: string): Promise<void> {
    await this.saved.remove(userId, schemeId);
  }

  async listIds(userId: string): Promise<string[]> {
    return (await this.saved.list(userId)).map((s) => s.schemeId);
  }

  async list(userId: string, profile?: ApplicantProfile): Promise<SchemeListItem[]> {
    const today = todayInKst(this.clock.now());
    const items: SchemeListItem[] = [];
    for (const row of await this.saved.list(userId)) {
      const program = await this.schemes.findById(row.schemeId);
      if (!program) continue;
      items.push(toItem(program, today, profile));
    }
    return items;
  }

  async merge(userId: string, schemeIds: string[]): Promise<string[]> {
    const unique = [...new Set(schemeIds.map((id) => id.trim()).filter(Boolean))];
    for (const id of unique) {
      const result = await this.save(userId, id);
      if (result.status === "limit") break;
    }
    return this.listIds(userId);
  }
}

function toItem(program: FinanceScheme, today: string, profile?: ApplicantProfile): SchemeListItem {
  return {
    program,
    status: getSchemeStatus(program, today),
    eligibility: profile ? evaluateEligibility(program, profile, today) : null,
  };
}
