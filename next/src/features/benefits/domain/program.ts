import type { IsoDate } from "@/common/domain/date";
import type { CategoryId, ProgramStatus, SourceId } from "./enums";
import type { Region } from "@/common/domain/region";

/** 프로그램의 원본 출처 */
export interface ProgramSourceRef {
  source: SourceId; // source
  externalId: string; // externalId
  url: string | null; // url
  raw: unknown; // raw
  fetchedAt: string; // fetchedAt
}

/** 도메인 interface: BenefitProgram. */
export interface BenefitProgram {
  id: string; // id
  mergeKey: string; // mergeKey
  title: string; // title
  organization: string; // organization
  categoryId: CategoryId; // categoryId
  /** 검색·필터용 키워드 태그 */
  tags: string[]; // tags
  regions: Region[]; // regions
  applicationStart: IsoDate | null; // applicationStart
  applicationEnd: IsoDate | null; // applicationEnd
  announcementDate: IsoDate | null; // announcementDate
  /** 지원 내용·자격 요약 */
  summary: string | null; // summary
  /** 신청·상세 안내 URL */
  url: string | null; // url
  sources: ProgramSourceRef[]; // sources
}

/** 도메인 type: BenefitProgramDraft. */
export type BenefitProgramDraft = Omit<BenefitProgram, "id" | "mergeKey">;

/** 접수 상태. 날짜가 모두 없으면 상시모집으로 보고 신청중으로 취급한다. */
/** 도메인 function: getProgramStatus. */
export function getProgramStatus(
  program: Pick<BenefitProgram, "applicationStart" | "applicationEnd">,
  today: IsoDate,
): ProgramStatus {
  const { applicationStart: start, applicationEnd: end } = program;
  if (end && end < today) return "closed";
  if (start && start > today) return "upcoming";
  return "open";
}
