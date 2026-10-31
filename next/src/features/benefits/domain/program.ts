import type { IsoDate } from "@/common/domain/date";
import type { CategoryId, ProgramStatus, SourceId } from "./enums";
import type { Region } from "@/common/domain/region";

/** 프로그램의 원본 출처 */
export interface ProgramSourceRef {
  source: SourceId;
  externalId: string;
  url: string | null;
  raw: unknown;
  fetchedAt: string;
}

export interface BenefitProgram {
  id: string;
  mergeKey: string;
  title: string;
  organization: string;
  categoryId: CategoryId;
  /** 검색·필터용 키워드 태그 */
  tags: string[];
  regions: Region[];
  applicationStart: IsoDate | null;
  applicationEnd: IsoDate | null;
  announcementDate: IsoDate | null;
  /** 지원 내용·자격 요약 */
  summary: string | null;
  /** 신청·상세 안내 URL */
  url: string | null;
  sources: ProgramSourceRef[];
}

export type BenefitProgramDraft = Omit<BenefitProgram, "id" | "mergeKey">;

/** 접수 상태. 날짜가 모두 없으면 상시모집으로 보고 신청중으로 취급한다. */
export function getProgramStatus(
  program: Pick<BenefitProgram, "applicationStart" | "applicationEnd">,
  today: IsoDate,
): ProgramStatus {
  const { applicationStart: start, applicationEnd: end } = program;
  if (end && end < today) return "closed";
  if (start && start > today) return "upcoming";
  return "open";
}
