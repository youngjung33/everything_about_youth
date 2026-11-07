import { getJobPostingStatus, type JobPosting } from "@/features/jobs/domain/job-posting";
import { evaluateEligibility } from "@/features/jobs/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/jobs/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { Clock } from "@/common/application/system";
import type { JobPostingRepository } from "../ports/posting-repository";
import type { SavedJobPostingRepository } from "../ports/saved-posting-repository";
import type { PostingListItem } from "./search-job-postings";

export const MAX_SAVED_PROGRAMS = 100;

export type SaveSchemeResult = { status: "saved" } | { status: "already" } | { status: "not_found" } | { status: "limit"; max: number };

export class ManageSavedJobPostings {
  constructor(
    private readonly saved: SavedJobPostingRepository,
    private readonly postings: JobPostingRepository,
    private readonly clock: Clock,
  ) {}

  async save(userId: string, schemeId: string): Promise<SaveSchemeResult> {
    if (await this.saved.isSaved(userId, schemeId)) return { status: "already" };
    if (!(await this.postings.findById(schemeId))) return { status: "not_found" };
    if ((await this.saved.count(userId)) >= MAX_SAVED_PROGRAMS) return { status: "limit", max: MAX_SAVED_PROGRAMS };
    await this.saved.save(userId, schemeId, this.clock.now().toISOString());
    return { status: "saved" };
  }

  async unsave(userId: string, schemeId: string): Promise<void> {
    await this.saved.remove(userId, schemeId);
  }

  async listIds(userId: string): Promise<string[]> {
    return (await this.saved.list(userId)).map((s) => s.postingId);
  }

  async list(userId: string, profile?: ApplicantProfile): Promise<PostingListItem[]> {
    const today = todayInKst(this.clock.now());
    const items: PostingListItem[] = [];
    for (const row of await this.saved.list(userId)) {
      const program = await this.postings.findById(row.postingId);
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

function toItem(scheme: JobPosting, today: string, profile?: ApplicantProfile): PostingListItem {
  return {
    program,
    status: getJobPostingStatus(program, today),
    eligibility: profile ? evaluateEligibility(program, profile, today) : null,
  };
}
