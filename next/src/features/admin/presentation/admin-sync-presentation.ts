import type { AdminSessionView } from "../application/use-cases/verify-admin-session";
import { adminDevDiagnosticsEnabled } from "./admin-dev-diagnostics";

/** 수집 이력·비고 열에 보여줄 오류 문자열(운영·권한에 따라 마스킹). */
export function formatAdminSyncErrorText(
  error: string | null | undefined,
  session: AdminSessionView,
  canViewRuns: boolean,
): string {
  if (!error?.trim()) return "";
  if (!canViewRuns) {
    return "권한 없음 — 실행 이력을 볼 수 있는 관리자만 상세 오류를 확인할 수 있습니다.";
  }
  if (!adminDevDiagnosticsEnabled(session)) {
    const compact = error.length > 120 ? `${error.slice(0, 120)}…` : error;
    return compact;
  }
  return error;
}