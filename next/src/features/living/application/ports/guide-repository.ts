import type { IsoDate } from "@/common/domain/date";
import type { ProcedureTypeId, GuideStatus } from "@/features/living/domain/enums";
import type { LivingGuide } from "@/features/living/domain/guide";
import type { Sido } from "@/common/domain/region";

export type GuideSort = "deadline" | "latest";

export interface GuideSearchQuery {
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  procedureTypeIds?: ProcedureTypeId[];
  tags?: string[];
  statuses?: GuideStatus[];
  keyword?: string;
  sort: GuideSort;
  limit?: number;
  offset?: number;
}

export interface GuideSearchResult {
  items: LivingGuide[];
  total: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

export interface GuideRepository {
  search(query: GuideSearchQuery): Promise<GuideSearchResult>;
  findById(id: string): Promise<LivingGuide | null>;
  findExistingFor(incoming: LivingGuide[]): Promise<LivingGuide[]>;
  upsertMany(guides: LivingGuide[]): Promise<UpsertResult>;
}
