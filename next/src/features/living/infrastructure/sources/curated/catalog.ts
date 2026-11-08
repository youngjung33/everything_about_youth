import type { ProcedureTypeId } from "@/features/living/domain/enums";
import type { ChecklistStep, LivingGuideDraft } from "@/features/living/domain/guide";

export interface CuratedCatalogEntry {
  slug: string;
  title: string;
  organization: string;
  procedureTypeId: ProcedureTypeId;
  tags: string[];
  summary: string;
  url: string | null;
  steps: Omit<ChecklistStep, "order">[];
}

/** 큐레이션 catalog — sync `curated` 소스 단일 출처 */
export const CURATED_CATALOG: CuratedCatalogEntry[] = [
  {
    slug: "move-in-report",
    title: "전입신고 (주민등록)",
    organization: "행정안전부·주민센터",
    procedureTypeId: "move_in",
    tags: ["전입", "주민센터", "정부24"],
    summary:
      "새 거주지로 옮긴 뒤 14일 이내 전입신고를 해야 합니다. 임대차 계약·확정일자·전입신고 순서를 맞추면 임대차 보호에 유리합니다. 관할 주민센터 또는 정부24에서 신청할 수 있습니다.",
    url: "https://www.gov.kr/portal/service/serviceInfo/PTR000050333",
    steps: [
      {
        title: "이사 전: 계약·확정일자 확인",
        summary: "임대차 계약서 특약, 등기부등본, 확정일자(또는 전입신고) 순서를 계약서와 맞춥니다.",
        url: "https://www.molit.go.kr",
      },
      {
        title: "전입신고 서류 준비",
        summary: "신분증, 임대차계약서 사본, 임대인 동의(필요 시) 등을 준비합니다.",
        url: "https://www.gov.kr",
      },
      {
        title: "주민센터 또는 정부24 신청",
        summary: "새 거주지 관할 주민센터 방문 또는 정부24 온라인 전입신고를 이용합니다.",
        url: "https://www.gov.kr/portal/service/serviceInfo/PTR000050333",
      },
    ],
  },
  {
    slug: "lease-fixed-date",
    title: "임대차 계약 확정일자",
    organization: "국토교통부·주민센터",
    procedureTypeId: "lease",
    tags: ["확정일자", "전세", "월세"],
    summary:
      "전·월세 계약 후 확정일자를 받으면 대항력·우선변제권 요건(전입신고 + 확정일자)을 갖출 수 있습니다. 주민센터 또는 등기소에서 받을 수 있으며, 계약 금액·기간과 계약서 내용이 일치해야 합니다.",
    url: "https://www.gov.kr/portal/service/serviceInfo/PTR000050334",
    steps: [
      {
        title: "계약서·신분증 확인",
        summary: "임대인·임차인 서명·날인된 계약서와 신분증을 준비합니다.",
        url: null,
      },
      {
        title: "확정일자 받기",
        summary: "관할 주민센터 또는 등기소에서 확정일자를 받습니다(수수료·절차는 기관 안내).",
        url: "https://www.gov.kr/portal/service/serviceInfo/PTR000050334",
      },
      {
        title: "전입신고와 날짜 정리",
        summary: "확정일자·전입신고·실제 입주일을 메모해 두고, 분쟁 시 증거로 보관합니다.",
        url: null,
      },
    ],
  },
  {
    slug: "before-move-in",
    title: "전입 전 임대차·등기 확인",
    organization: "국토교통부",
    procedureTypeId: "lease",
    tags: ["등기부등본", "깡통전세", "특약"],
    summary:
      "계약 전 등기부등본·건축물대장으로 소유·근저당·가압류를 확인하고, 특약(전세보증금 반환, 수리 책임 등)을 명시합니다. 청년·1인 가구는 전세사기 예방 앱·안내를 함께 확인하세요.",
    url: "https://www.gov.kr/portal/service/serviceInfo/PTR000050335",
    steps: [
      {
        title: "등기부등본·건축물대장 열람",
        summary: "소유자, 근저당, 가압류·경매 여부를 확인합니다.",
        url: "https://www.iros.go.kr",
      },
      {
        title: "계약 특약 검토",
        summary: "보증금 반환 조건, 수리·하자, 해지 사유를 특약에 적습니다.",
        url: null,
      },
      {
        title: "전세보증금 반환보증(선택)",
        summary: "HUG 등 전세보증금 반환보증 가입 여부를 임대인과 협의합니다.",
        url: "https://www.khug.or.kr",
      },
    ],
  },
  {
    slug: "moving-day",
    title: "이사 당일·입주 직후",
    organization: "자치단체·임대인",
    procedureTypeId: "moving",
    tags: ["이사", "하자", "실측"],
    summary:
      "입주 시 실측·사진으로 하자를 기록하고, 열쇠·관리비·주차 등을 확인합니다. 이사업체·보험, 관리사무소 연락처를 정리해 두세요.",
    url: null,
    steps: [
      {
        title: "실측·하자 사진",
        summary: "벽·바닥·창문·설비 상태를 사진·메모로 남깁니다.",
        url: null,
      },
      {
        title: "열쇠·관리비·주차",
        summary: "관리사무소에 입주 신고, 관리비·주차 등록 방법을 확인합니다.",
        url: null,
      },
      {
        title: "공과금 명의(예약)",
        summary: "전기·가스·수도·인터넷 해지·개통 일정을 이사일 전후로 맞춥니다.",
        url: null,
      },
    ],
  },
  {
    slug: "utilities-transfer",
    title: "전기·가스·수도·인터넷 명의 이전",
    organization: "한국전력·지역 가스·수도사업소",
    procedureTypeId: "utilities",
    tags: ["전기", "가스", "인터넷"],
    summary:
      "이사 전후로 사용 중지·개통 신청을 합니다. 전입신고 전에도 전기 사용 신청은 가능한 경우가 많으나, 기관별 안내를 확인하세요.",
    url: "https://www.kepco.co.kr",
    steps: [
      {
        title: "전기 사용 시작·해지",
        summary: "한전(또는 지역 전기) 고객센터·앱에서 이전지 해지·신주소 사용 신청.",
        url: "https://www.kepco.co.kr",
      },
      {
        title: "도시가스·LPG",
        summary: "지역 도시가스사에 연락해 안전점검·명의 변경을 신청합니다.",
        url: null,
      },
      {
        title: "인터넷·TV 이전",
        summary: "통신사에 이전 설치 예약(희망일·주소)을 잡습니다.",
        url: null,
      },
    ],
  },
  {
    slug: "waste-recycling",
    title: "쓰레기·재활용(종량제) 안내",
    organization: "지방자치단체",
    procedureTypeId: "waste",
    tags: ["종량제", "재활용", "대형폐기물"],
    summary:
      "이사 후 거주지 **관할 구·군·시** 종량제 봉투 규격·배출 요일·대형폐기물 신고 방법이 다릅니다. 관할 지자체 홈페이지 또는 120 다산콜센터로 확인하세요.",
    url: "https://www.epr.or.kr",
    steps: [
      {
        title: "관할 지자체 확인",
        summary: "새 주소 기준 구·군·시 환경/청소과 안내를 찾습니다.",
        url: "https://www.120.go.kr",
      },
      {
        title: "배출 요일·분리배출",
        summary: "일반·재활용·음식물 분리 규칙과 배출 시간대를 확인합니다.",
        url: null,
      },
      {
        title: "대형폐기물·이사 잔여물",
        summary: "가구·매트리스 등은 대형폐기물 스티커·신고 후 배출합니다.",
        url: null,
      },
    ],
  },
];

export function curatedDrafts(fetchedAt: string): LivingGuideDraft[] {
  return CURATED_CATALOG.map((e) => ({
    title: e.title,
    organization: e.organization,
    procedureTypeId: e.procedureTypeId,
    tags: e.tags,
    regions: [],
    applicationStart: null,
    applicationEnd: null,
    announcementDate: null,
    summary: e.summary,
    checklistSteps: e.steps.map((s, i) => ({ order: i + 1, ...s })),
    url: e.url,
    sources: [{ source: "curated", externalId: e.slug, url: e.url, raw: e, fetchedAt }],
  }));
}
