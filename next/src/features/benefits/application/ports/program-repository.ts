import type { IsoDate } from "@/common/domain/date";
import type { CategoryId, ProgramStatus } from "@/features/benefits/domain/enums";
import type { BenefitProgram } from "@/features/benefits/domain/program";
import type { Sido } from "@/common/domain/region";

export type ProgramSort = "deadline" | "latest";

export interface ProgramSearchQuery {
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  categoryIds?: CategoryId[];
  tags?: string[];
  statuses?: ProgramStatus[];
  keyword?: string;
  sort: ProgramSort;
  limit?: number;
  offset?: number;
}

export interface ProgramSearchResult {
  items: BenefitProgram[];
  total: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

export interface ProgramRepository {
  search(query: ProgramSearchQuery): Promise<ProgramSearchResult>;
  findById(id: string): Promise<BenefitProgram | null>;
  findExistingFor(incoming: BenefitProgram[]): Promise<BenefitProgram[]>;
  upsertMany(programs: BenefitProgram[]): Promise<UpsertResult>;
}
