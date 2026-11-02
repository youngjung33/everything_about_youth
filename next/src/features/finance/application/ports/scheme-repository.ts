import type { IsoDate } from "@/common/domain/date";
import type { ProductTypeId, SchemeStatus } from "@/features/finance/domain/enums";
import type { FinanceScheme } from "@/features/finance/domain/scheme";
import type { Sido } from "@/common/domain/region";

export type SchemeSort = "deadline" | "latest";

export interface SchemeSearchQuery {
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  productTypeIds?: ProductTypeId[];
  tags?: string[];
  statuses?: SchemeStatus[];
  keyword?: string;
  sort: SchemeSort;
  limit?: number;
  offset?: number;
}

export interface SchemeSearchResult {
  items: FinanceScheme[];
  total: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

export interface SchemeRepository {
  search(query: SchemeSearchQuery): Promise<SchemeSearchResult>;
  findById(id: string): Promise<FinanceScheme | null>;
  findExistingFor(incoming: FinanceScheme[]): Promise<FinanceScheme[]>;
  upsertMany(schemes: FinanceScheme[]): Promise<UpsertResult>;
}
