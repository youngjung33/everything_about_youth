import type { ApplicantProfile } from "@/features/housing/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import { getNoticeStatus } from "@/features/housing/domain/notice";
import type { NoticeListItem } from "./search-notices";
import { evaluateEligibility } from "@/features/housing/domain/eligibility/evaluate";
import type { NoticeRepository } from "../ports/notice-repository";
import type { Clock } from "@/common/application/system";

export class GetNoticeDetail {
  constructor(
    private readonly repo: NoticeRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, profile?: ApplicantProfile): Promise<NoticeListItem | null> {
    const notice = await this.repo.findById(id);
    if (!notice) return null;
    const today = todayInKst(this.clock.now());
    return {
      notice,
      status: getNoticeStatus(notice, today),
      eligibility: profile ? evaluateEligibility(notice, profile, today) : null,
    };
  }
}
