import type { IsoDate } from "@/common/domain/date";
import type { ProcedureTypeId, GuideStatus } from "./enums";
import type { Region } from "@/common/domain/region";

export interface ChecklistStep {
  order: number;
  title: string;
  summary: string;
  url: string | null;
}

/** 안내의 원본 출처 */
export interface GuideSourceRef {
  source: import("./enums").SourceId;
  externalId: string;
  url: string | null;
  raw: unknown;
  fetchedAt: string;
}

export interface LivingGuide {
  id: string;
  mergeKey: string;
  title: string;
  organization: string;
  procedureTypeId: ProcedureTypeId;
  tags: string[];
  regions: Region[];
  applicationStart: IsoDate | null;
  applicationEnd: IsoDate | null;
  announcementDate: IsoDate | null;
  summary: string | null;
  checklistSteps: ChecklistStep[];
  url: string | null;
  sources: GuideSourceRef[];
}

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
