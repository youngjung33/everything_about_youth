import { VERDICT_LABELS, type EligibilityResult } from "@/features/housing/domain/eligibility/evaluate";

export function EligibilityBadge({ result }: { result: EligibilityResult | null }) {
  if (!result) return null;
  return (
    <span className={`badge verdict-${result.verdict}`} title={result.reasons.join("\n")}>
      {VERDICT_LABELS[result.verdict]}
    </span>
  );
}
