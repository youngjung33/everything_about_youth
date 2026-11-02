/** 주거·자금 제도 유형 */
export const PRODUCT_TYPE_IDS = [
  "jeonse_loan",
  "lease_deposit",
  "housing_savings",
  "guarantee",
  "tax_benefit",
  "other",
] as const;
export type ProductTypeId = (typeof PRODUCT_TYPE_IDS)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductTypeId, string> = {
  jeonse_loan: "전세·주택자금대출",
  lease_deposit: "임대보증금",
  housing_savings: "청약·주택저축",
  guarantee: "보증·보증보험",
  tax_benefit: "세금·소득공제",
  other: "기타",
};

export const SCHEME_STATUSES = ["upcoming", "open", "closed"] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

export const SCHEME_STATUS_LABELS: Record<SchemeStatus, string> = {
  upcoming: "신청예정",
  open: "신청중",
  closed: "마감",
};

/** 운영 sync id. 추가 후보는 next/README.md «청년 주거·자금» */
export const SOURCE_IDS = ["curated", "ontong-finance", "demo"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  curated: "큐레이션 catalog",
  "ontong-finance": "온통청년(금융·세금)",
  demo: "데모 데이터",
};

const normalizeText = (v: string) => v.replace(/\s+/g, "");

/** 제목·키워드 → ProductTypeId */
export function inferProductTypeFromText(text: string | null | undefined): ProductTypeId {
  const t = normalizeText(text ?? "");
  if (!t) return "other";
  if (t.includes("전세") || t.includes("주택자금") || t.includes("버팀목")) return "jeonse_loan";
  if (t.includes("보증금") || t.includes("임대보증")) return "lease_deposit";
  if (t.includes("청약") || t.includes("주택저축") || t.includes("청년주택")) return "housing_savings";
  if (t.includes("보증") || t.includes("HUG") || t.includes("HF")) return "guarantee";
  if (t.includes("세금") || t.includes("소득공제") || t.includes("공제")) return "tax_benefit";
  return "other";
}

/** 온통 목록에서 finance 섹션에 넣을 정책인지(금융·세금·주거자금 성격) */
export function isOntongFinancePolicy(categoryText: string | null | undefined, title: string | null | undefined): boolean {
  const t = normalizeText(`${categoryText ?? ""}${title ?? ""}`);
  if (!t) return false;
  return (
    t.includes("금융") ||
    t.includes("대출") ||
    t.includes("세금") ||
    t.includes("소득") ||
    t.includes("전세") ||
    t.includes("청약") ||
    t.includes("보증금") ||
    t.includes("주택자금") ||
    t.includes("버팀목")
  );
}
