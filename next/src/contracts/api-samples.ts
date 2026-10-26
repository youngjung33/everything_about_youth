import type { Clock } from "@/common/application/system";
import type { SessionDto } from "@/common/presentation/api/auth";
import type { AppConfigDto } from "@/common/presentation/api/app-config";
import { loadAppPolicy } from "@/common/infrastructure/config/app-policy-config";
import { handleGetAppConfig } from "@/common/presentation/api/app-config";
import type { FeaturesDto } from "@/common/presentation/api/features";
import { HOUSING_FEATURE_ID } from "@/features/housing/feature";
import { createNotice } from "@/features/housing/domain/identity";
import type { NoticeDraft } from "@/features/housing/domain/notice";
import {
  buildMeta,
  toNoticeDetailDto,
  toNoticeListDto,
  type HousingMetaDto,
  type NoticeDetailDto,
  type NoticeListDto,
} from "@/features/housing/presentation/api/dto";
import type { Notice } from "@/features/housing/domain/notice";

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
