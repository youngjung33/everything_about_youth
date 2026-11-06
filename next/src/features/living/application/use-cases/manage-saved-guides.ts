import { getGuideStatus, type LivingGuide } from "@/features/living/domain/guide";
import { todayInKst } from "@/common/domain/date";
import type { Clock } from "@/common/application/system";
import type { GuideRepository } from "../ports/guide-repository";
import type { SavedGuideRepository } from "../ports/saved-guide-repository";
import type { GuideListItem } from "./search-guides";

export const MAX_SAVED_GUIDES = 100;

export type SaveGuideResult = { status: "saved" } | { status: "already" } | { status: "not_found" } | { status: "limit"; max: number };

export class ManageSavedGuides {
  constructor(
    private readonly saved: SavedGuideRepository,
    private readonly guides: GuideRepository,
    private readonly clock: Clock,
  ) {}

  async save(userId: string, guideId: string): Promise<SaveGuideResult> {
    if (await this.saved.isSaved(userId, guideId)) return { status: "already" };
    if (!(await this.guides.findById(guideId))) return { status: "not_found" };
    if ((await this.saved.count(userId)) >= MAX_SAVED_GUIDES) return { status: "limit", max: MAX_SAVED_GUIDES };
    await this.saved.save(userId, guideId, this.clock.now().toISOString());
    return { status: "saved" };
  }

  async unsave(userId: string, guideId: string): Promise<void> {
    await this.saved.remove(userId, guideId);
  }

  async listIds(userId: string): Promise<string[]> {
    return (await this.saved.list(userId)).map((s) => s.guideId);
  }

  async list(userId: string): Promise<GuideListItem[]> {
    const today = todayInKst(this.clock.now());
    const items: GuideListItem[] = [];
    for (const row of await this.saved.list(userId)) {
      const program = await this.guides.findById(row.guideId);
      if (!program) continue;
      items.push(toItem(program, today));
    }
    return items;
  }

  async merge(userId: string, guideIds: string[]): Promise<string[]> {
    const unique = [...new Set(guideIds.map((id) => id.trim()).filter(Boolean))];
    for (const id of unique) {
      const result = await this.save(userId, id);
      if (result.status === "limit") break;
    }
    return this.listIds(userId);
  }
}

function toItem(program: LivingGuide, today: string): GuideListItem {
  return {
    program,
    status: getGuideStatus(program, today),
    eligibility: null,
  };
}
