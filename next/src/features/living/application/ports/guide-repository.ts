import type { IsoDate } from "@/common/domain/date";
import type { ProcedureTypeId, GuideStatus } from "@/features/living/domain/enums";
import type { LivingGuide } from "@/features/living/domain/guide";
import type { Sido } from "@/common/domain/region";

/** 목록 정렬 기준 */
export type GuideSort = "deadline" | "latest";

export interface GuideSearchQuery {
  /** 상태 계산 기준일 */
  today: IsoDate;
  sidos?: Sido[];
  sigungu?: string;
  procedureTypeIds?: ProcedureTypeId[];
  tags?: string[];
  /** 비어 있으면 안내중+안내예정 */
  statuses?: GuideStatus[];
  keyword?: string;
  sort: GuideSort;
  /** 생략하면 전체 반환 */
  limit?: number;
  offset?: number;
}

export interface GuideSearchResult {
  items: LivingGuide[];
  /** limit/offset 적용 전 전체 건수 */
  total: number;
}

export interface UpsertResult {
  inserted: number; // 신규 삽입 건수
  updated: number; // 기존 갱신 건수
}

/** 생활·행정 안내 저장소 포트. 1차는 SQLite, 2차는 Supabase(Postgres)로 구현체만 교체한다. */
export interface GuideRepository {
  search(query: GuideSearchQuery): Promise<GuideSearchResult>;
  findById(id: string): Promise<LivingGuide | null>;
  /** incoming 과 병합키 또는 소스 외부ID가 같은 기존 안내를 반환한다. */
  findExistingFor(incoming: LivingGuide[]): Promise<LivingGuide[]>;
  upsertMany(guides: LivingGuide[]): Promise<UpsertResult>;
}