import { VERDICT_LABELS, type EligibilityResult } from "@/features/housing/domain/eligibility/evaluate";

/** 자격 판정 결과 뱃지. null 이면 렌더하지 않는다. */
export function EligibilityBadge({ result }: { result: EligibilityResult | null }) {
  if (!result) return null;
  return (
    <span className={`badge verdict-${result.verdict}`} title={result.reasons.join("\n")}>
      {VERDICT_LABELS[result.verdict]}
    </span>
  );
}
