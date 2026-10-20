/** 공급유형 */
export const SUPPLY_TYPES = [
  "happy_housing", // 행복주택
  "youth_purchase_rental", // 청년매입임대
  "national_rental", // 국민임대
  "permanent_rental", // 영구임대
  "jeonse_rental", // 전세임대
  "integrated_public_rental", // 통합공공임대
  "long_term_jeonse", // 장기전세
  "purchase_rental", // 매입임대(일반)
  "public_rental", // 공공임대(10년·50년 등)
  "public_support_rental", // 공공지원민간임대
  "private_rental", // 민간임대
  "public_sale", // 공공분양
  "private_sale", // 민간분양
  "newlywed_hope_town", // 신혼희망타운
  "other",
] as const;
export type SupplyType = (typeof SUPPLY_TYPES)[number];

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  happy_housing: "행복주택",
  youth_purchase_rental: "청년매입임대",
  national_rental: "국민임대",
  permanent_rental: "영구임대",
  jeonse_rental: "전세임대",
  integrated_public_rental: "통합공공임대",
  long_term_jeonse: "장기전세",
  purchase_rental: "매입임대",
  public_rental: "공공임대(10·50년)",
  public_support_rental: "공공지원민간임대",
  private_rental: "민간임대",
  public_sale: "공공분양",
  private_sale: "민간분양",
  newlywed_hope_town: "신혼희망타운",
  other: "기타",
};

/** 주택유형 */
export const HOUSING_TYPES = [
  "apartment", // 아파트
  "officetel", // 오피스텔
  "multi_family", // 다세대·다가구·연립
  "urban_living", // 도시형생활주택·원룸
  "other",
] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  apartment: "아파트",
  officetel: "오피스텔",
  multi_family: "다세대·연립",
  urban_living: "도시형·원룸",
  other: "기타",
};

export const NOTICE_STATUSES = ["upcoming", "open", "closed"] as const;
export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  upcoming: "접수예정",
  open: "접수중",
  closed: "마감",
};

/** 데이터 소스 식별자 */
export const SOURCE_IDS = ["lh", "myhome", "applyhome", "sh", "gh", "ih", "demo"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  lh: "LH 분양임대공고",
  myhome: "마이홈포털",
  applyhome: "청약홈",
  sh: "SH서울주택도시공사",
  gh: "GH경기주택도시공사",
  ih: "iH인천도시공사",
  demo: "데모 데이터",
};

const normalizeText = (v: string) => v.replace(/\s+/g, "");

/** 공급유형 텍스트 → SupplyType */
export function parseSupplyType(text: string | null | undefined): SupplyType {
  const t = normalizeText(text ?? "");
  if (!t) return "other";
  if (t.includes("신혼희망타운")) return "newlywed_hope_town";
  if (t.includes("행복주택")) return "happy_housing";
  if (t.includes("청년") && t.includes("매입")) return "youth_purchase_rental";
  if (t.includes("통합공공임대")) return "integrated_public_rental";
  if (t.includes("장기전세")) return "long_term_jeonse";
  if (t.includes("매입임대") || t.includes("다가구매입")) return "purchase_rental";
  if (t.includes("전세임대")) return "jeonse_rental";
  if (t.includes("국민임대")) return "national_rental";
  if (t.includes("영구임대")) return "permanent_rental";
  if (t.includes("공공임대") || /(10|50)년임대/.test(t) || /공임\d+년/.test(t)) return "public_rental";
  if (t.includes("공공지원")) return "public_support_rental";
  if (t.includes("민간임대") || t.includes("민간사전")) return "private_rental";
  if (t.includes("공공분양") || t.includes("분양전환")) return "public_sale";
  if (t.includes("분양")) return "private_sale";
  return "other";
}

/** 주택유형 텍스트 → HousingType */
export function parseHousingType(text: string | null | undefined): HousingType {
  const t = normalizeText(text ?? "");
  if (!t) return "other";
  if (t.includes("오피스텔")) return "officetel";
  if (t.includes("아파트")) return "apartment";
  if (t.includes("도시형") || t.includes("원룸") || t.includes("생활숙박") || t.includes("생활주택"))
    return "urban_living";
  if (t.includes("다세대") || t.includes("다가구") || t.includes("연립") || t.includes("빌라") || t.includes("매입"))
    return "multi_family";
  return "other";
}
