import { getRuntimeEnv } from "@/common/infrastructure/config/runtime-env-config";
import type { AdminSessionView } from "../application/use-cases/verify-admin-session";

/** 개발 환경에서만, 최고 권한 관리자용 상세 진단(권한 JSON·수집 오류 원문 등). */
export function adminDevDiagnosticsEnabled(session: AdminSessionView): boolean {
  if (getRuntimeEnv().appEnv !== "dev") return false;
  if (!session.isRoot && session.role !== "super") return false;
  return session.permissions.dashboard === "edit";
}