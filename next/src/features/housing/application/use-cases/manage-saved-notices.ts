import { getNoticeStatus, type Notice } from "@/features/housing/domain/notice";
import { evaluateEligibility } from "@/features/housing/domain/eligibility/evaluate";
import type { ApplicantProfile } from "@/features/housing/domain/eligibility/applicant";
import { todayInKst } from "@/common/domain/date";
import type { Clock } from "@/common/application/system";
import type { NoticeRepository } from "../ports/notice-repository";
import type { SavedNoticeRepository } from "../ports/saved-notice-repository";
import type { NoticeListItem } from "./search-notices";

/** 회원 한 명이 저장할 수 있는 관심 공고 수. 남용과 목록 조회 부담을 막는다. */
export const MAX_SAVED_NOTICES = 100;

export type SaveNoticeResult = { status: "saved" } | { status: "already" } | { status: "not_found" } | { status: "limit"; max: number };

export class ManageSavedNotices {
  constructor(
    private readonly saved: SavedNoticeRepository,
    private readonly notices: NoticeRepository,
    private readonly clock: Clock,
  ) {}

  async save(userId: string, noticeId: string): Promise<SaveNoticeResult> {
    if (await this.saved.isSaved(userId, noticeId)) return { status: "already" };
    if (!(await this.notices.findById(noticeId))) return { status: "not_found" };
    if ((await this.saved.count(userId)) >= MAX_SAVED_NOTICES) return { status: "limit", max: MAX_SAVED_NOTICES };
    await this.saved.save(userId, noticeId, this.clock.now().toISOString());
    return { status: "saved" };
  }

  async unsave(userId: string, noticeId: string): Promise<void> {
    await this.saved.remove(userId, noticeId);
  }

  async listIds(userId: string): Promise<string[]> {
    return (await this.saved.list(userId)).map((s) => s.noticeId);
  }

  /**
   * 저장한 순서(최근이 앞). 공고가 사라진 항목은 건너뛴다.
   * [profile] 이 있으면 자격 판정도 붙인다.
   */
  async list(userId: string, profile?: ApplicantProfile): Promise<NoticeListItem[]> {
    const today = todayInKst(this.clock.now());
    const items: NoticeListItem[] = [];
    for (const row of await this.saved.list(userId)) {
      const notice = await this.notices.findById(row.noticeId);
      if (!notice) continue;
      items.push(toItem(notice, today, profile));
    }
    return items;
  }

  /**
   * 비회원 기기에서 들고 온 id 를 회원 목록에 합친다. 없는 공고는 건너뛰고, 상한을 넘기면 거기서 멈춘다.
   */
  async merge(userId: string, noticeIds: string[]): Promise<string[]> {
    const unique = [...new Set(noticeIds.map((id) => id.trim()).filter(Boolean))];
    for (const id of unique) {
      const result = await this.save(userId, id);
      if (result.status === "limit") break;
    }
    return this.listIds(userId);
  }
}

function toItem(notice: Notice, today: string, profile?: ApplicantProfile): NoticeListItem {
  return {
    notice,
    status: getNoticeStatus(notice, today),
    eligibility: profile ? evaluateEligibility(notice, profile, today) : null,
  };
}
