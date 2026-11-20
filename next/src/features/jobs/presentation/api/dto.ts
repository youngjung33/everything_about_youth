import type { IsoDate } from "@/common/domain/date";
import { SIDO_LIST } from "@/common/domain/region";
import { formatDday } from "@/common/presentation/format";
import type { EligibilityResult } from "@/features/jobs/domain/eligibility/evaluate";
import { VERDICT_LABELS } from "@/features/jobs/domain/eligibility/evaluate";
import { MAX_HOUSEHOLD_SIZE, STANDARDS_YEAR, URBAN_WORKER_INCOME_100 } from "@/features/jobs/domain/eligibility/standards";
import {
  HIRE_TYPE_IDS,
  HIRE_TYPE_LABELS,
  POSTING_STATUS_LABELS,
  POSTING_STATUSES,
  SOURCE_LABELS,
} from "@/features/jobs/domain/enums";
import { googleCalendarDeadlineUrl } from "@/features/jobs/domain/calendar";
import type { PostingListItem, SearchJobPostingsOutput } from "@/features/jobs/application/use-cases/search-job-postings";
import { regionLabel } from "../region-label";

/**
 * 모바일/웹 앱(Flutter)이 소비하는 JSON 계약.
 * 값(코드)과 한글 라벨을 함께 내려 클라이언트가 라벨 표를 복제하지 않아도 되게 한다.
 * 금액은 원, 면적은 ㎡, 날짜는 YYYY-MM-DD(KST 기준) 이다.
 */
export interface EligibilityDto {
  verdict: string; // 판정 코드
  verdictLabel: string; // 판정 한글 라벨
  reasons: string[]; // 판정 사유
  notes: string[]; // 추가 안내
}

/** API JSON: RegionDto. */
export interface RegionDto {
  sido: string; // 시·도
  sigungu: string | null; // 시·군·구
}

/** API JSON: PostingSummaryDto. */
export interface PostingSummaryDto {
  id: string; // id
  title: string; // 제목
  organization: string; // 기관
  hireTypeId: string; // 채용 유형
  categoryLabel: string; // 유형 한글
  tags: string[]; // 태그
  status: string; // 상태 코드
  statusLabel: string; // 상태 한글
  dday: string | null; // D-day
  regions: RegionDto[]; // regions
  regionLabel: string; // 지역 요약
  applicationStart: string | null; // 접수 시작
  applicationEnd: string | null; // 접수 종료
  announcementDate: string | null; // 공고일
  summary: string | null; // 요약
  url: string | null; // URL
  sourceLabels: string[]; // 출처 라벨
  eligibility: EligibilityDto | null; // 참고 판정
}

/** API JSON: PostingSourceDto. */
export interface PostingSourceDto {
  source: string; // 소스 id
  sourceLabel: string; // 소스 한글
  externalId: string; // 외부 id
  url: string | null; // URL
  fetchedAt: string; // 수집 시각
}

export interface PostingDetailDto extends PostingSummaryDto {
  googleCalendarUrl: string | null; // 캘린더 URL
  sources: PostingSourceDto[]; // 출처
}

/** API JSON: PostingListDto. */
export interface PostingListDto {
  items: PostingSummaryDto[]; // 항목
  total: number; // 총 건수
  page: number; // 페이지
  pageSize: number; // pageSize
  totalPages: number; // 총 페이지
  today: string; // 기준일
}

/** API JSON: OptionDto. */
export interface OptionDto {
  value: string; // 코드
  label: string; // 한글
}

/** 자격 판정에 쓰는 기준표(참고용). 앱이 입력 화면에서 소득 수준을 안내할 때 쓴다. */
export interface EligibilityStandardsDto {
  year: number; // 기준 연도
  maxHouseholdSize: number; // 가구원 상한
  urbanWorkerIncome: number[]; // 월소득 표
}

/** API JSON: JobsMetaDto. */
export interface JobsMetaDto {
  dataUpdatedAt: string | null; // 수집 시각
  categories: OptionDto[]; // 채용 유형 목록
  statuses: OptionDto[]; // 상태 목록
  verdicts: OptionDto[]; // 판정 목록
  sorts: OptionDto[]; // 정렬 목록
  sidos: string[]; // 시도 목록
  standards: EligibilityStandardsDto; // 기준표
}

/** 판정 DTO 변환. */
function toEligibilityDto(result: EligibilityResult | null): EligibilityDto | null {
  if (!result) return null;
  return {
    verdict: result.verdict,
    verdictLabel: VERDICT_LABELS[result.verdict],
    reasons: result.reasons,
    notes: result.notes,
  };
}

/** 공고 요약. */
export function toPostingSummaryDto(item: PostingListItem, today: IsoDate): PostingSummaryDto {
  const { program, status, eligibility } = item;
  return {
    id: program.id,
    title: program.title,
    organization: program.organization,
    hireTypeId: program.hireTypeId,
    categoryLabel: HIRE_TYPE_LABELS[program.hireTypeId],
    tags: program.tags,
    status,
    statusLabel: POSTING_STATUS_LABELS[status],
    dday: formatDday(program.applicationStart, program.applicationEnd, today),
    regions: program.regions.map((r) => ({ sido: r.sido, sigungu: r.sigungu })),
    regionLabel: regionLabel(program.regions),
    applicationStart: program.applicationStart,
    applicationEnd: program.applicationEnd,
    announcementDate: program.announcementDate,
    summary: program.summary,
    url: program.url,
    sourceLabels: [...new Set(program.sources.map((s) => SOURCE_LABELS[s.source]))],
    eligibility: toEligibilityDto(eligibility),
  };
}

/** 공고 상세. */
export function toPostingDetailDto(item: PostingListItem, today: IsoDate): PostingDetailDto {
  const { program } = item;
  return {
    ...toPostingSummaryDto(item, today),
    googleCalendarUrl: googleCalendarDeadlineUrl({
      title: program.title,
      applicationEnd: program.applicationEnd,
      summary: program.summary,
      url: program.url,
    }),
    sources: program.sources.map((s) => ({
      source: s.source,
      sourceLabel: SOURCE_LABELS[s.source],
      externalId: s.externalId,
      url: s.url,
      fetchedAt: s.fetchedAt,
    })),
  };
}

/** 공고 목록. */
export function toPostingListDto(result: SearchJobPostingsOutput, today: IsoDate): PostingListDto {
  return {
    items: result.items.map((i) => toPostingSummaryDto(i, today)),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    today,
  };
}

/** jobs meta. */
export function buildJobsMeta(dataUpdatedAt: string | null = null): JobsMetaDto {
  return {
    dataUpdatedAt,
    categories: HIRE_TYPE_IDS.map((value) => ({ value, label: HIRE_TYPE_LABELS[value] })),
    statuses: POSTING_STATUSES.map((value) => ({ value, label: POSTING_STATUS_LABELS[value] })),
    verdicts: (Object.keys(VERDICT_LABELS) as Array<keyof typeof VERDICT_LABELS>).map((value) => ({
      value,
      label: VERDICT_LABELS[value],
    })),
    sorts: [
      { value: "deadline", label: "마감 임박순" },
      { value: "latest", label: "최신 공고순" },
    ],
    sidos: [...SIDO_LIST],
    standards: {
      year: STANDARDS_YEAR,
      maxHouseholdSize: MAX_HOUSEHOLD_SIZE,
      urbanWorkerIncome: [...URBAN_WORKER_INCOME_100],
    },
  };
}
