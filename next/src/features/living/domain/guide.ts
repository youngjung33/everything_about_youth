import type { IsoDate } from "@/common/domain/date";
import type { ProcedureTypeId, GuideStatus } from "./enums";
import type { Region } from "@/common/domain/region";

/** 도메인 interface: ChecklistStep. */
export interface ChecklistStep {
  order: number; // order
  title: string; // title
  summary: string; // summary
  url: string | null; // url
}

/** 안내의 원본 출처 */
export interface GuideSourceRef {
  source: import("./enums").SourceId; // source
  externalId: string; // externalId
  url: string | null; // url
  raw: unknown; // raw
  fetchedAt: string; // fetchedAt
}

/** 도메인 interface: LivingGuide. */
export interface LivingGuide {
  id: string; // id
  mergeKey: string; // mergeKey
  title: string; // title
  organization: string; // organization
  procedureTypeId: ProcedureTypeId; // procedureTypeId
  tags: string[]; // tags
  regions: Region[]; // regions
  applicationStart: IsoDate | null; // applicationStart
  applicationEnd: IsoDate | null; // applicationEnd
  announcementDate: IsoDate | null; // announcementDate
  summary: string | null; // summary
  checklistSteps: ChecklistStep[]; // checklistSteps
  url: string | null; // url
  sources: GuideSourceRef[]; // sources
}

/** 도메인 type: LivingGuideDraft. */
export type LivingGuideDraft = Omit<LivingGuide, "id" | "mergeKey">;

/** 접수·진행 상태. 날짜가 없으면 진행중(open)으로 본다. */
export function getGuideStatus(
  program: Pick<LivingGuide, "applicationStart" | "applicationEnd">,
  today: IsoDate,
): GuideStatus {
  const { applicationStart: start, applicationEnd: end } = program;
  if (end && end < today) return "closed";
  if (start && start > today) return "upcoming";
  return "open";
}
