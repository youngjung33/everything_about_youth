/** 채용·일자리 공고 유형 */
export const HIRE_TYPE_IDS = [
  "public_official",
  "public_corp",
  "youth",
  "new_grad",
  "intern",
  "other",
] as const;
export type HireTypeId = (typeof HIRE_TYPE_IDS)[number];

export const HIRE_TYPE_LABELS: Record<HireTypeId, string> = {
  public_official: "공무원·공공",
  public_corp: "공기업·준정부",
  youth: "청년 전용",
  new_grad: "신입·수습",
  intern: "인턴·체험",
  other: "기타",
};

export const POSTING_STATUSES = ["upcoming", "open", "closed"] as const;
export type PostingStatus = (typeof POSTING_STATUSES)[number];

export const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
  upcoming: "모집예정",
  open: "모집중",
  closed: "마감",
};

/** 운영 sync id. 추가 후보는 next/README.md «청년·공공 일자리» */
export const SOURCE_IDS = ["curated", "demo"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  curated: "큐레이션 catalog",
  demo: "데모 데이터",
};

const normalizeText = (v: string) => v.replace(/\s+/g, "");

/** 제목·키워드 → HireTypeId */
export function inferHireTypeFromText(text: string | null | undefined): HireTypeId {
  const t = normalizeText(text ?? "");
  if (!t) return "other";
  if (t.includes("공무원") || t.includes("9급") || t.includes("7급") || t.includes("국가직")) return "public_official";
  if (t.includes("공기업") || t.includes("준정부") || t.includes("알리오") || t.includes("NCS")) return "public_corp";
  if (t.includes("인턴") || t.includes("체험") || t.includes("현장실습")) return "intern";
  if (t.includes("청년") || t.includes("youth")) return "youth";
  if (t.includes("신입") || t.includes("수습") || t.includes("신규")) return "new_grad";
  return "other";
}
