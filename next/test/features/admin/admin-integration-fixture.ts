import { createCommonContainer } from "@/common/infrastructure/container";
import type { Clock } from "@/common/application/system";
import { openSqlite, runMigrations, type SqliteConnection } from "@/common/infrastructure/persistence/sqlite/client";
import { getAdminContainer } from "@/features/admin/admin-container";
import { adminJwtConfig } from "@/features/admin/admin-container";
import { ensureBootstrapAdmin } from "@/features/admin/application/use-cases/ensure-bootstrap-admin";
import { LoginAdmin } from "@/features/admin/application/use-cases/login-admin";
import { ADMIN_SESSION_COOKIE, signAdminSessionCookie } from "@/features/admin/presentation/admin-session-cookie";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";
import { insertTestAdmin } from "./admin-db-fixture";
import type { AdminRole } from "@/features/admin/domain/role";

const COMMON_KEY = Symbol.for("everything_about_youth.common-container");
const ADMIN_KEY = Symbol.for("everything_about_youth.admin-container");

const fixedClock: Clock = { now: () => new Date("2026-06-01T12:00:00.000Z") };

export interface AdminIntegrationHarness {
  conn: SqliteConnection;
  cookieHeader: (sid: string, loginId: string, role: AdminRole) => Promise<string>;
  loginAs: (loginId: string, password: string) => Promise<string>;
  bootstrapAndLogin: () => Promise<string>;
}

/** API·assertSyncOperator 테스트용 in-memory DB + 글로벌 컨테이너 */
export function setupAdminIntegration(): AdminIntegrationHarness {
  const conn = openSqlite(":memory:");
  runMigrations(conn.db);
  const common = createCommonContainer({
    persistence: { driver: "sqlite", sqlite: conn },
    clock: fixedClock,
  });
  const g = globalThis as typeof globalThis & Record<symbol, unknown>;
  g[COMMON_KEY] = common;
  delete g[ADMIN_KEY];

  async function cookieHeader(sid: string, loginId: string, role: AdminRole): Promise<string> {
    const jwt = adminJwtConfig();
    const exp = "2030-01-01T00:00:00.000Z";
    const token = await signAdminSessionCookie({ sid, loginId, role }, jwt.secret, jwt.issuer, jwt.audience, exp);
    return `${ADMIN_SESSION_COOKIE}=${token}`;
  }

  async function loginAs(loginId: string, password: string): Promise<string> {
    const container = getAdminContainer();
    const result = await container.login.execute(
      loginId,
      password,
      fixedClock.now().toISOString(),
      fixedClock.now().getTime(),
    );
    return cookieHeader(result.sessionId, result.loginId, result.role);
  }

  async function bootstrapAndLogin(): Promise<string> {
    const { accounts } = createAdminRepositories(conn.db, fixedClock);
    await ensureBootstrapAdmin(accounts, fixedClock.now().toISOString());
    return loginAs("ADMIN", "123456");
  }

  return { conn, cookieHeader, loginAs, bootstrapAndLogin };
}

export function teardownAdminIntegration(conn: SqliteConnection): void {
  conn.close();
  const g = globalThis as typeof globalThis & Record<symbol, unknown>;
  delete g[COMMON_KEY];
  delete g[ADMIN_KEY];
}

/** viewer 계정 + DB 세션 (쿠키 sid 와 일치) */
export async function seedViewerSession(h: AdminIntegrationHarness, loginId = "viewer1"): Promise<string> {
  const { accounts, sessions } = createAdminRepositories(h.conn.db, fixedClock);
  await insertTestAdmin(accounts, loginId, "viewer");
  const sid = `sid-${loginId}`;
  await sessions.create(sid, loginId, "2030-01-01T00:00:00.000Z", fixedClock.now().toISOString());
  return h.cookieHeader(sid, loginId, "viewer");
}