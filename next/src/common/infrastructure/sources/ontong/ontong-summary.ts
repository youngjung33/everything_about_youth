import { findDeep, type Json } from "@/common/infrastructure/http/mapping";

/** 목록 API 요약만으로는 부족할 때 상세 API를 호출한다. */
export const ONTONG_MIN_SUMMARY_CHARS = 80;

export function needsOntongSummaryEnrichment(summary: string | null | undefined): boolean {
  return (summary?.trim() ?? "").length < ONTONG_MIN_SUMMARY_CHARS;
}

function deepStr(root: Json, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = findDeep(root, key);
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    } else if (typeof v === "number" || typeof v === "boolean") return String(v);
  }
  return null;
}

/** 목록·상세 JSON에서 앱 본문용 요약 문자열을 만든다. */
export function buildOntongSummaryText(root: Json, existing: string | null | undefined): string | null {
  const chunks: string[] = [];
  const seen = new Set<string>();

  const add = (text: string | null) => {
    if (!text) return;
    const t = text.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    chunks.push(t);
  };

  add(existing?.trim() ?? null);
  add(deepStr(root, "plcyExplnCn", "plcySmryCn", "expln", "summary"));
  add(deepStr(root, "sprtQlfcCn", "slctnMthdCn", "rqutCn"));
  add(deepStr(root, "aplyMthdCn", "aplyMthCn", "aplyMthdExpln"));
  add(deepStr(root, "sprtCn", "sprtTrgtCn", "bizCn"));

  const merged = chunks.join("\n\n").trim();
  return merged || null;
}

export function readOntongListSummary(row: Json): string | null {
  return deepStr(row, "plcyExplnCn", "plcySmryCn", "expln", "summary");
}

export function readOntongPolicyId(row: Json): string | null {
  return deepStr(row, "plcyId", "plcyNo", "bizId", "policyId");
}

/** 목록 row 만으로 앱 본문이 충분한지. 부족하면 상세 API를 호출한다. */
export function needsOntongDetailEnrichment(row: Json): boolean {
  const listSummary = readOntongListSummary(row);
  if (needsOntongSummaryEnrichment(listSummary)) return true;

  const merged = buildOntongSummaryText(row, listSummary);
  if (!merged || merged.length < ONTONG_MIN_SUMMARY_CHARS) return true;

  const apply = deepStr(row, "aplyMthdCn", "aplyMthCn", "aplyMthdExpln");
  const qual = deepStr(row, "sprtQlfcCn", "slctnMthdCn", "rqutCn");
  if (!apply && !qual) return true;

  return false;
}
