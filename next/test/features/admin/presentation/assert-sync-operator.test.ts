import { describe, expect, it } from "vitest";
import { ApiError } from "@/common/presentation/api/errors";
import { OPERATOR_TOKEN_HEADER } from "@/common/presentation/api/operator";
import { assertSyncOperator } from "@/features/admin/presentation/assert-sync-operator";
import { setupAdminIntegration, seedViewerSession, teardownAdminIntegration } from "../admin-integration-fixture";
import { insertTestAdmin } from "../admin-db-fixture";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";

const TOKEN = "operator-token-for-tests-0123456789";

const prodEnv = { NODE_ENV: "production", OPERATOR_TOKEN: TOKEN };

describe("assertSyncOperator", () => {
  it("쿠키·토큰 모두 없으면 FORBIDDEN", async () => {
    const req = new Request("http://localhost/api/v1/housing/sync");
    await expect(assertSyncOperator(req, "housing", prodEnv)).rejects.toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("운영에서 operator 토큰 없으면 OPERATOR_DISABLED", async () => {
    const req = new Request("http://localhost/api/v1/housing/sync");
    await expect(assertSyncOperator(req, "housing", { NODE_ENV: "production" })).rejects.toThrowError(
      expect.objectContaining({ code: "OPERATOR_DISABLED" }),
    );
  });

  it("운영에서 operator 토큰만 맞으면 통과", async () => {
    const env = { NODE_ENV: "production", OPERATOR_TOKEN: TOKEN };
    const req = new Request("http://localhost/api/v1/housing/sync", {
      headers: { [OPERATOR_TOKEN_HEADER]: TOKEN },
    });
    await expect(assertSyncOperator(req, "housing", env)).resolves.toBeUndefined();
  });

  it("viewer 관리자 쿠키로 housing 수집 트리거는 거절", async () => {
    const h = setupAdminIntegration();
    try {
      const cookie = await seedViewerSession(h);
      const req = new Request("http://localhost/api/v1/housing/sync", { headers: { cookie } });
      await expect(assertSyncOperator(req, "housing", prodEnv)).rejects.toThrowError(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("operator 쿠키로 housing·benefits 수집 트리거 허용", async () => {
    const h = setupAdminIntegration();
    try {
      const clock = { now: () => new Date("2026-06-01T12:00:00.000Z") };
      const { accounts, sessions } = createAdminRepositories(h.conn.db, clock);
      await insertTestAdmin(accounts, "op", "operator");
      const sid = "sid-op";
      await sessions.create(sid, "op", "2030-01-01T00:00:00.000Z", "2026-06-01T12:00:00.000Z");
      const cookie = await h.cookieHeader(sid, "op", "operator");
      await expect(
        assertSyncOperator(new Request("http://localhost/api/v1/housing/sync", { headers: { cookie } }), "housing", prodEnv),
      ).resolves.toBeUndefined();
      await expect(
        assertSyncOperator(new Request("http://localhost/api/v1/benefits/sync", { headers: { cookie } }), "benefits", prodEnv),
      ).resolves.toBeUndefined();
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("override 로 benefits 권한 없으면 benefits sync 거절", async () => {
    const h = setupAdminIntegration();
    try {
      const clock = { now: () => new Date("2026-06-01T12:00:00.000Z") };
      const { accounts, sessions } = createAdminRepositories(h.conn.db, clock);
      await accounts.insert(
        {
          loginId: "op2",
          role: "operator",
          disabled: false,
          isRoot: false,
          permissionsOverride: { sync: { housing: { page: "edit", triggerSync: true }, benefits: { page: "none", triggerSync: false } } },
          createdAt: "t",
          updatedAt: "t",
          createdBy: null,
        },
        (await import("@/features/admin/domain/password")).hashAdminPassword("secret12"),
      );
      const sid = "sid-op2";
      await sessions.create(sid, "op2", "2030-01-01T00:00:00.000Z", "2026-06-01T12:00:00.000Z");
      const cookie = await h.cookieHeader(sid, "op2", "operator");
      await expect(
        assertSyncOperator(new Request("http://x", { headers: { cookie } }), "benefits", prodEnv),
      ).rejects.toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });
});