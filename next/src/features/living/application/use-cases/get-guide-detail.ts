import { todayInKst } from "@/common/domain/date";
import { getGuideStatus } from "@/features/living/domain/guide";
import type { GuideListItem } from "./search-guides";
import type { GuideRepository } from "../ports/guide-repository";
import type { Clock } from "@/common/application/system";

export class GetGuideDetail {
  constructor(
    private readonly repo: GuideRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<GuideListItem | null> {
    const program = await this.repo.findById(id);
    if (!program) return null;
    const today = todayInKst(this.clock.now());
    return {
      program,
      status: getGuideStatus(program, today),
      eligibility: null,
    };
  }
}
