import { describe, expect, it } from "vitest";
import { permissionsForRole } from "@/features/admin/domain/permissions";
import { formatAdminSyncErrorText } from "@/features/admin/presentation/admin-sync-presentation";
import type { AdminSessionView } from "@/features/admin/application/use-cases/verify-admin-session";

const session: AdminSessionView = {
  sessionId: "s",
  loginId: "op",
  role: "operator",
  isRoot: false,
  permissions: permissionsForRole("operator"),
};

describe("formatAdminSyncErrorText", () => {
  it("canViewRuns false 면 권한 없음 문구", () => {
    expect(formatAdminSyncErrorText("secret stack", session, false)).toMatch(/권한 없음/);
  });

  it("긴 오류는 dev 가 아니면 잘린다", () => {
    const long = "x".repeat(200);
    const out = formatAdminSyncErrorText(long, session, true);
    expect(out.length).toBeLessThanOrEqual(121);
  });
});