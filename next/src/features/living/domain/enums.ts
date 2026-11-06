/** 이사·생활 절차 유형 */
export const PROCEDURE_TYPE_IDS = ["move_in", "lease", "moving", "utilities", "registry", "waste", "other"] as const;
export type ProcedureTypeId = (typeof PROCEDURE_TYPE_IDS)[number];

export const PROCEDURE_TYPE_LABELS: Record<ProcedureTypeId, string> = {
  move_in: "전입·전출",
  lease: "임대차·확정일자",
  moving: "이사 준비",
  utilities: "공과금·통신",
  registry: "등기·주민센터",
  waste: "쓰레기·재활용",
  other: "기타",
};

export const GUIDE_STATUSES = ["upcoming", "open", "closed"] as const;
export type GuideStatus = (typeof GUIDE_STATUSES)[number];

export const GUIDE_STATUS_LABELS: Record<GuideStatus, string> = {
  upcoming: "예정",
  open: "진행중",
  closed: "종료",
};

/** 운영 sync id */
export const SOURCE_IDS = ["curated", "demo"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  curated: "큐레이션 catalog",
  demo: "데모 데이터",
};

export function inferProcedureTypeFromText(text: string | null | undefined): ProcedureTypeId {
  const t = (text ?? "").replace(/\s+/g, "");
  if (!t) return "other";
  if (t.includes("전입") || t.includes("전출") || t.includes("주민등록")) return "move_in";
  if (t.includes("확정일자") || t.includes("임대차") || t.includes("전세계약")) return "lease";
  if (t.includes("이사") || t.includes("하자") || t.includes("실측")) return "moving";
  if (t.includes("전기") || t.includes("가스") || t.includes("수도") || t.includes("인터넷")) return "utilities";
  if (t.includes("등기") || t.includes("주민센터")) return "registry";
  if (t.includes("쓰레기") || t.includes("재활용") || t.includes("종량제")) return "waste";
  return "other";
}
