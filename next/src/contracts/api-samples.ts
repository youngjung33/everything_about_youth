import type { Clock } from "@/common/application/system";
import type { SessionDto } from "@/common/presentation/api/auth";
import type { AppConfigDto } from "@/common/presentation/api/app-config";
import { loadAppPolicy } from "@/common/infrastructure/config/app-policy-config";
import { handleGetAppConfig } from "@/common/presentation/api/app-config";
import type { FeaturesDto } from "@/common/presentation/api/features";
import { HOUSING_FEATURE_ID } from "@/features/housing/feature";
import { createNotice } from "@/features/housing/domain/identity";
import type { NoticeDraft, Notice } from "@/features/housing/domain/notice";
import {
  buildMeta,
  toNoticeDetailDto,
  toNoticeListDto,
  type HousingMetaDto,
  type NoticeDetailDto,
  type NoticeListDto,
} from "@/features/housing/presentation/api/dto";
import {
  buildMeta as buildBenefitsMeta,
  toProgramDetailDto,
  toProgramListDto,
  type BenefitsMetaDto,
  type ProgramDetailDto,
  type ProgramListDto,
} from "@/features/benefits/presentation/api/dto";
import {
  buildFinanceMeta,
  toSchemeDetailDto,
  toSchemeListDto,
  type FinanceMetaDto,
  type SchemeDetailDto,
  type SchemeListDto,
} from "@/features/finance/presentation/api/dto";
import { createJobPosting } from "@/features/jobs/domain/identity";
import type { JobPostingDraft, JobPosting } from "@/features/jobs/domain/job-posting";
import {
  buildJobsMeta,
  toPostingDetailDto,
  toPostingListDto,
  type JobsMetaDto,
  type PostingDetailDto,
  type PostingListDto,
} from "@/features/jobs/presentation/api/dto";
import {
  buildLivingMeta,
  toGuideDetailDto,
  toGuideListDto,
  type LivingMetaDto,
  type GuideDetailDto,
  type GuideListDto,
} from "@/features/living/presentation/api/dto";
import { createGuide } from "@/features/living/domain/identity";
import type { LivingGuideDraft } from "@/features/living/domain/guide";
import { createProgram } from "@/features/benefits/domain/identity";
import { createScheme } from "@/features/finance/domain/identity";
import type { BenefitProgramDraft } from "@/features/benefits/domain/program";
import type { BenefitProgram } from "@/features/benefits/domain/program";
import type { FinanceSchemeDraft } from "@/features/finance/domain/scheme";
import type { FinanceScheme } from "@/features/finance/domain/scheme";

/** 계약 JSON 과 서버 테스트가 같은 시각·데이터를 쓴다. */
export const CONTRACT_CLOCK: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };
export const CONTRACT_TODAY = "2026-10-12";

export function contractNoticeDraft(): NoticeDraft {
  return {
    title: "서울 행복주택 모집",
    organization: "LH",
    supplyType: "happy_housing",
    housingTypes: ["apartment"],
    regions: [{ sido: "서울", sigungu: "강남구" }],
    applicationStart: "2026-10-01",
    applicationEnd: "2026-10-15",
    announcementDate: "2026-09-28",
    winnerAnnouncementDate: "2026-11-01",
    totalHouseholds: 15,
    eligibilityText: "문의: 1600-1004",
    url: "https://example.com/n1",
    complexes: [
      {
        name: "가단지",
        address: "서울 강남구 1",
        region: { sido: "서울", sigungu: "강남구" },
        housingType: "apartment",
        households: 15,
        units: [
          { name: "16A", exclusiveAreaM2: 16.5, households: 10, deposit: 15_000_000, monthlyRent: 120_000 },
          { name: "26B", exclusiveAreaM2: 26.5, households: 5, deposit: 25_000_000, monthlyRent: 180_000 },
        ],
      },
    ],
    sources: [
      {
        source: "lh",
        externalId: "1",
        url: "https://example.com/lh/1",
        raw: { secret: "x" },
        fetchedAt: "2026-10-11T00:00:00.000Z",
      },
    ],
  };
}

function contractNotice(): Notice {
  return createNotice(contractNoticeDraft());
}

export function contractNoticeListDto(): NoticeListDto {
  const notice = contractNotice();
  return toNoticeListDto(
    {
      items: [{ notice, status: "open", eligibility: null }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    },
    CONTRACT_TODAY,
  );
}

export function contractNoticeDetailDto(): NoticeDetailDto {
  const notice = contractNotice();
  return toNoticeDetailDto(
    { notice, status: "open", eligibility: null },
    CONTRACT_TODAY,
  );
}

export function contractHousingMetaDto(): HousingMetaDto {
  return buildMeta("2026-10-12T01:00:00.000Z");
}

/** 토큰 값은 예시. 앱은 필드 이름·타입만 맞으면 된다. */
export function contractAppConfigDto(): AppConfigDto {
  return handleGetAppConfig({ version: "1.0.0", platform: "android" }, loadAppPolicy({})).body;
}

export function contractFeaturesDto(): FeaturesDto {
  return { features: [{ id: HOUSING_FEATURE_ID, enabled: true }] };
}

export function contractSessionDto(): SessionDto {
  return {
    tokenType: "Bearer",
    accessToken: "contract-access-token",
    accessExpiresIn: 900,
    refreshToken: "contract-refresh-token",
    refreshExpiresIn: 2_592_000,
    member: false,
  };
}

export function contractProgramDraft(): BenefitProgramDraft {
  return {
    title: "청년 월세 지원",
    organization: "서울시",
    categoryId: "housing",
    tags: ["월세", "청년"],
    regions: [{ sido: "서울", sigungu: "" }],
    applicationStart: "2026-10-01",
    applicationEnd: "2026-10-20",
    announcementDate: "2026-09-25",
    summary: "만 19~39세 무주택 청년 월세 지원",
    url: "https://example.com/b1",
    sources: [
      {
        source: "demo",
        externalId: "demo-1",
        url: "https://example.com/demo/1",
        raw: { id: 1 },
        fetchedAt: "2026-10-11T00:00:00.000Z",
      },
    ],
  };
}

function contractProgram(): BenefitProgram {
  return createProgram(contractProgramDraft());
}

export function contractProgramListDto(): ProgramListDto {
  const program = contractProgram();
  return toProgramListDto(
    {
      items: [{ program, status: "open", eligibility: null }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    },
    CONTRACT_TODAY,
  );
}

export function contractProgramDetailDto(): ProgramDetailDto {
  const program = contractProgram();
  return toProgramDetailDto({ program, status: "open", eligibility: null }, CONTRACT_TODAY);
}

export function contractBenefitsMetaDto(): BenefitsMetaDto {
  return buildBenefitsMeta("2026-10-12T01:00:00.000Z");
}

export function contractSchemeDraft(): FinanceSchemeDraft {
  return {
    title: "청년 전세자금 대출",
    organization: "한국주택금융공사",
    productTypeId: "jeonse_loan",
    tags: ["전세", "대출"],
    regions: [{ sido: "세종", sigungu: "세종시" }],
    applicationStart: "2026-10-01",
    applicationEnd: "2026-10-20",
    announcementDate: "2026-09-25",
    summary: "무주택 청년 전세자금 대출 안내",
    url: "https://example.com/f1",
    sources: [
      {
        source: "demo",
        externalId: "demo-f1",
        url: "https://example.com/demo/f1",
        raw: { id: 1 },
        fetchedAt: "2026-10-11T00:00:00.000Z",
      },
    ],
  };
}

function contractScheme(): FinanceScheme {
  return createScheme(contractSchemeDraft());
}

export function contractSchemeListDto(): SchemeListDto {
  const scheme = contractScheme();
  return toSchemeListDto(
    {
      items: [{ program: scheme, status: "open", eligibility: null }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    },
    CONTRACT_TODAY,
  );
}

export function contractSchemeDetailDto(): SchemeDetailDto {
  const scheme = contractScheme();
  return toSchemeDetailDto({ program: scheme, status: "open", eligibility: null }, CONTRACT_TODAY);
}

export function contractFinanceMetaDto(): FinanceMetaDto {
  return buildFinanceMeta("2026-10-12T01:00:00.000Z");
}

export function contractPostingDraft(): JobPostingDraft {
  return {
    title: "공기업 신입 NCS 채용",
    organization: "한국수자원공사",
    hireTypeId: "public_corp",
    tags: ["신입", "NCS"],
    regions: [{ sido: "대전", sigungu: "대전시" }],
    applicationStart: "2026-10-01",
    applicationEnd: "2026-10-20",
    announcementDate: "2026-09-25",
    summary: "신입·NCS 전형 채용 안내",
    url: "https://example.com/j1",
    sources: [
      {
        source: "demo",
        externalId: "demo-j1",
        url: "https://example.com/demo/j1",
        raw: { id: 1 },
        fetchedAt: "2026-10-11T00:00:00.000Z",
      },
    ],
  };
}

function contractPosting(): JobPosting {
  return createJobPosting(contractPostingDraft());
}

export function contractPostingListDto(): PostingListDto {
  const posting = contractPosting();
  return toPostingListDto(
    {
      items: [{ program: posting, status: "open", eligibility: null }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    },
    CONTRACT_TODAY,
  );
}

export function contractPostingDetailDto(): PostingDetailDto {
  const posting = contractPosting();
  return toPostingDetailDto({ program: posting, status: "open", eligibility: null }, CONTRACT_TODAY);
}

export function contractJobsMetaDto(): JobsMetaDto {
  return buildJobsMeta("2026-10-12T01:00:00.000Z");
}

export function contractGuideDraft(): LivingGuideDraft {
  return {
    title: "전입신고 안내",
    organization: "행정안전부",
    procedureTypeId: "move_in",
    tags: ["전입", "주민센터"],
    regions: [{ sido: "세종", sigungu: "세종시" }],
    applicationStart: "2026-10-01",
    applicationEnd: "2026-10-20",
    announcementDate: "2026-09-25",
    summary: "새 주소로 이사한 뒤 14일 이내 전입신고",
    checklistSteps: [
      { order: 1, title: "임대차계약서", summary: "확정일자가 있는 계약서", url: null },
      { order: 2, title: "주민센터·정부24", summary: "온라인 또는 방문 신고", url: "https://example.com/move-in" },
    ],
    url: "https://example.com/l1",
    sources: [
      {
        source: "curated",
        externalId: "curated-move-in",
        url: "https://example.com/demo/l1",
        raw: { id: 1 },
        fetchedAt: "2026-10-11T00:00:00.000Z",
      },
    ],
  };
}

function contractGuide() {
  return createGuide(contractGuideDraft());
}

export function contractGuideListDto(): GuideListDto {
  const guide = contractGuide();
  return toGuideListDto(
    {
      items: [{ program: guide, status: "open", eligibility: null }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    },
    CONTRACT_TODAY,
  );
}

export function contractGuideDetailDto(): GuideDetailDto {
  const guide = contractGuide();
  return toGuideDetailDto({ program: guide, status: "open", eligibility: null }, CONTRACT_TODAY);
}

export function contractLivingMetaDto(): LivingMetaDto {
  return buildLivingMeta("2026-10-12T01:00:00.000Z");
}
