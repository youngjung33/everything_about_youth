import type { ProductTypeId } from "@/features/finance/domain/enums";
import type { FinanceSchemeDraft } from "@/features/finance/domain/scheme";

export interface CuratedCatalogEntry {
  slug: string;
  title: string;
  organization: string;
  productTypeId: ProductTypeId;
  tags: string[];
  summary: string;
  url: string;
}

/** 큐레이션 catalog — sync `curated` 소스 단일 출처 */
export const CURATED_CATALOG: CuratedCatalogEntry[] = [
  {
    slug: "hf-youth-jeonse",
    title: "청년 전세자금대출(한국주택금융공사)",
    organization: "한국주택금융공사",
    productTypeId: "jeonse_loan",
    tags: ["전세", "HF"],
    summary:
      "무주택 청년·청년부부 등이 전세자금을 빌릴 수 있는 HF 상품군입니다. 대출 한도는 임차보증금·소득·DSR·기존 대출에 따라 달라지며, 금리는 고정·변동 선택이 있습니다. 신청은 HF 또는 연계 금융기관 창구·온라인 안내를 따릅니다.",
    url: "https://www.hf.go.kr/ko/sub01/sub01_01_01.do",
  },
  {
    slug: "butimok-loan",
    title: "버팀목 전세자금대출",
    organization: "한국주택금융공사",
    productTypeId: "jeonse_loan",
    tags: ["전세", "버팀목"],
    summary:
      "중·저소득층, 신혼·다자녀·한부모 등 계층별 버팀목 전세자금 대출입니다. 소득·자산·무주택 요건과 임차보증금 상한이 계층마다 다르며, 우대금리·보증료 감면이 붙을 수 있습니다.",
    url: "https://www.hf.go.kr/ko/sub01/sub01_02_01.do",
  },
  {
    slug: "hug-deposit-loan",
    title: "전세보증금 반환보증·임대보증금 대출",
    organization: "주택도시보증공사",
    productTypeId: "lease_deposit",
    tags: ["보증금", "HUG"],
    summary:
      "전세 계약 종료 시 보증금 반환을 돕는 HUG 보증과, 전세·월세 보증금 마련을 위한 대출·보증 상품 안내입니다. 임차인·임대인 요건, 보증 한도, 수수료를 상품별로 확인해야 합니다.",
    url: "https://www.khug.or.kr/",
  },
  {
    slug: "cheongyak-savings",
    title: "청약저축·주택청약종합저축",
    organization: "한국주택금융공사",
    productTypeId: "housing_savings",
    tags: ["청약", "저축"],
    summary:
      "주택 청약을 위해 가입하는 청약저축·주택청약종합저축입니다. 가입 자격(연령·거주지), 납입 방식, 청약 순위 산정과 무주택 요건이 상품·지역별 공고와 연동됩니다.",
    url: "https://www.hf.go.kr/ko/sub02/sub02_01.do",
  },
  {
    slug: "youth-cheongyak",
    title: "청년 주택드림 청약통장",
    organization: "한국주택금융공사",
    productTypeId: "housing_savings",
    tags: ["청년", "청약통장"],
    summary:
      "만 19~34세 등 청년 대상 청약통장(주택드림)으로, 가입·납입 후 청년 우선공급·금리·소득공제 혜택이 연계될 수 있습니다. 소득·무주택·기존 주택 소유 이력을 확인해야 합니다.",
    url: "https://www.hf.go.kr/ko/sub02/sub02_02.do",
  },
  {
    slug: "local-jeonse-support",
    title: "지자체 청년 전·월세 지원(대표)",
    organization: "지방자치단체",
    productTypeId: "lease_deposit",
    tags: ["월세", "전세", "지자체"],
    summary:
      "시·도·군·구에서 운영하는 청년 전·월세 한시 지원·대출 연계 사업을 묶어 안내합니다. 거주지(학교·직장·주민등록), 연령, 소득·학적 요건과 지원 금액·횟수는 **지자체마다 다릅니다**. 거주지 관할 지자체 공고를 확인하세요.",
    url: "https://www.youthcenter.go.kr",
  },
  {
    slug: "income-tax-deduction",
    title: "주택청약저축 소득공제",
    organization: "국세청",
    productTypeId: "tax_benefit",
    tags: ["소득공제", "세금"],
    summary:
      "주택청약종합저축·청약저축 납입액에 대한 소득·세액 공제입니다. 공제 한도(연 240만 원 등), 총급여 요건, 다른 주택 관련 공제와의 중복 여부를 과세연도 기준으로 확인해야 합니다.",
    url: "https://www.nts.go.kr",
  },
  {
    slug: "hf-guarantee",
    title: "주택금융 보증(주택담보대출·전세)",
    organization: "한국주택금융공사",
    productTypeId: "guarantee",
    tags: ["보증", "HF"],
    summary:
      "HF 보증을 통해 주택담보대출·전세자금대출 등을 이용하는 구조입니다. 보증 한도, 보증료, 연계 대출 금리는 차주 소득·담보·LTV에 따라 달라집니다.",
    url: "https://www.hf.go.kr",
  },
];

export function curatedDrafts(fetchedAt: string): FinanceSchemeDraft[] {
  return CURATED_CATALOG.map((e) => ({
    title: e.title,
    organization: e.organization,
    productTypeId: e.productTypeId,
    tags: e.tags,
    regions: [],
    applicationStart: null,
    applicationEnd: null,
    announcementDate: null,
    summary: e.summary,
    url: e.url,
    sources: [{ source: "curated", externalId: e.slug, url: e.url, raw: e, fetchedAt }],
  }));
}
