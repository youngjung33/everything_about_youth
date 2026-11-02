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
    summary: "무주택 청년의 전세자금 대출. 한도·금리·DSR은 상품별로 상이합니다.",
    url: "https://www.hf.go.kr/ko/sub01/sub01_01_01.do",
  },
  {
    slug: "butimok-loan",
    title: "버팀목 전세자금대출",
    organization: "한국주택금융공사",
    productTypeId: "jeonse_loan",
    tags: ["전세", "버팀목"],
    summary: "중·저소득·신혼·다자녀 등 계층별 전세자금 지원.",
    url: "https://www.hf.go.kr/ko/sub01/sub01_02_01.do",
  },
  {
    slug: "hug-deposit-loan",
    title: "전세보증금 반환보증·임대보증금 대출",
    organization: "주택도시보증공사",
    productTypeId: "lease_deposit",
    tags: ["보증금", "HUG"],
    summary: "임차인 전세보증금 반환보증 및 임대보증금 대출 관련 안내.",
    url: "https://www.khug.or.kr/",
  },
  {
    slug: "cheongyak-savings",
    title: "청약저축·주택청약종합저축",
    organization: "한국주택금융공사",
    productTypeId: "housing_savings",
    tags: ["청약", "저축"],
    summary: "주택 청약을 위한 저축 가입 요건·순위·무주택 요건.",
    url: "https://www.hf.go.kr/ko/sub02/sub02_01.do",
  },
  {
    slug: "youth-cheongyak",
    title: "청년 주택드림 청약통장",
    organization: "한국주택금융공사",
    productTypeId: "housing_savings",
    tags: ["청년", "청약통장"],
    summary: "청년 대상 청약통장(주택드림) 가입·우선공급 관련.",
    url: "https://www.hf.go.kr/ko/sub02/sub02_02.do",
  },
  {
    slug: "local-jeonse-support",
    title: "지자체 청년 전·월세 지원(대표)",
    organization: "지방자치단체",
    productTypeId: "lease_deposit",
    tags: ["월세", "전세", "지자체"],
    summary: "시·도별 청년 전·월세 지원 사업. 거주지·소득 요건은 지자체마다 다릅니다.",
    url: "https://www.youthcenter.go.kr",
  },
  {
    slug: "income-tax-deduction",
    title: "주택청약저축 소득공제",
    organization: "국세청",
    productTypeId: "tax_benefit",
    tags: ["소득공제", "세금"],
    summary: "청약저축 납입액에 대한 소득공제 한도·요건.",
    url: "https://www.nts.go.kr",
  },
  {
    slug: "hf-guarantee",
    title: "주택금융 보증(주택담보대출·전세)",
    organization: "한국주택금융공사",
    productTypeId: "guarantee",
    tags: ["보증", "HF"],
    summary: "주택금융공사 보증을 통한 대출 연계 상품 안내.",
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
