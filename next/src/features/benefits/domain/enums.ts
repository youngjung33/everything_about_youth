/** 정책 분야 */
export const CATEGORY_IDS = [
  "housing",
  "employment",
  "finance",
  "welfare",
  "education",
  "startup",
  "other",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  housing: "주거",
  employment: "일자리",
  finance: "금융·세금",
  welfare: "복지",
  education: "교육·문화",
  startup: "창업",
  other: "기타",
};

export const PROGRAM_STATUSES = ["upcoming", "open", "closed"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  upcoming: "신청예정",
  open: "신청중",
  closed: "마감",
};

/** 데이터 소스 식별자 */
/** 운영 sync id. 추가 후보는 next/README.md «청년 혜택·정책» */
export const SOURCE_IDS = ["ontong", "demo"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  ontong: "온통청년",
  demo: "데모 데이터",
};

const normalizeText = (v: string) => v.replace(/\s+/g, "");

/** 분류 텍스트 → CategoryId */
export function parseCategoryId(text: string | null | undefined): CategoryId {
  const t = normalizeText(text ?? "");
  if (!t) return "other";
  if (t.includes("주거") || t.includes("임대") || t.includes("전세") || t.includes("주택")) return "housing";
  if (t.includes("일자리") || t.includes("취업") || t.includes("고용") || t.includes("채용")) return "employment";
  if (t.includes("금융") || t.includes("대출") || t.includes("세금") || t.includes("소득")) return "finance";
  if (t.includes("복지") || t.includes("건강") || t.includes("돌봄")) return "welfare";
  if (t.includes("교육") || t.includes("문화") || t.includes("장학")) return "education";
  if (t.includes("창업") || t.includes("사업")) return "startup";
  return "other";
}
