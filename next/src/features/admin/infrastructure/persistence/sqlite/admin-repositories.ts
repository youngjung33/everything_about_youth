import { and, eq, sql } from "drizzle-orm";
import type { Clock } from "@/common/application/system";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import type { AdminAccount } from "@/features/admin/domain/admin-account";
import type { AdminRole } from "@/features/admin/domain/role";
import { adminAccounts, adminSessions } from "./schema";

export interface AdminAccountRepository {
  count(): number;
  findByLoginId(loginId: string): Promise<AdminAccount | null>;
  findPasswordHash(loginId: string): Promise<string | null>;
  list(): Promise<AdminAccount[]>;
  insert(account: AdminAccount, passwordHash: string): Promise<void>;
  updateRole(loginId: string, role: AdminRole, updatedAt: string): Promise<boolean>;
  setDisabled(loginId: string, disabled: boolean, updatedAt: string): Promise<boolean>;
  updatePassword(loginId: string, passwordHash: string, updatedAt: string): Promise<boolean>;
}

export interface AdminSessionRepository {
  create(id: string, loginId: string, expiresAt: string, createdAt: string): Promise<void>;
  findActive(id: string, nowIso: string): Promise<{ loginId: string } | null>;
  revoke(id: string): Promise<void>;
  revokeAllFor(loginId: string): Promise<void>;
}

function mapAccount(row: typeof adminAccounts.$inferSelect): AdminAccount {
  return {
    loginId: row.loginId,
    role: row.role as AdminRole,
    disabled: row.disabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

/** SQLite 관리자 계정·세션 */
export function createAdminRepositories(db: SqliteDb, clock: Clock): {
  accounts: AdminAccountRepository;
  sessions: AdminSessionRepository;
} {
  const accounts: AdminAccountRepository = {
    count() {
      const row = db.select({ count: sql<number>`count(*)` }).from(adminAccounts).get();
      return row?.count ?? 0;
    },
    async findByLoginId(loginId) {
      const row = db.select().from(adminAccounts).where(eq(adminAccounts.loginId, loginId)).get();
      return row ? mapAccount(row) : null;
    },
    async findPasswordHash(loginId) {
      const row = db
        .select({ passwordHash: adminAccounts.passwordHash })
        .from(adminAccounts)
        .where(eq(adminAccounts.loginId, loginId))
        .get();
      return row?.passwordHash ?? null;
    },
    async list() {
      return db.select().from(adminAccounts).all().map(mapAccount);
    },
    async insert(account, passwordHash) {
      db.insert(adminAccounts)
        .values({
          loginId: account.loginId,
          passwordHash,
          role: account.role,
          disabled: account.disabled,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
          createdBy: account.createdBy,
        })
        .run();
    },
    async updateRole(loginId, role, updatedAt) {
      const r = db.update(adminAccounts).set({ role, updatedAt }).where(eq(adminAccounts.loginId, loginId)).run();
      return r.changes > 0;
    },
    async setDisabled(loginId, disabled, updatedAt) {
      const r = db.update(adminAccounts).set({ disabled, updatedAt }).where(eq(adminAccounts.loginId, loginId)).run();
      return r.changes > 0;
    },
    async updatePassword(loginId, passwordHash, updatedAt) {
      const r = db.update(adminAccounts).set({ passwordHash, updatedAt }).where(eq(adminAccounts.loginId, loginId)).run();
      return r.changes > 0;
    },
  };

  const sessions: AdminSessionRepository = {
    async create(id, loginId, expiresAt, createdAt) {
      db.insert(adminSessions).values({ id, loginId, expiresAt, createdAt, revoked: false }).run();
    },
    async findActive(id, nowIso) {
      const row = db
        .select({ loginId: adminSessions.loginId })
        .from(adminSessions)
        .where(and(eq(adminSessions.id, id), eq(adminSessions.revoked, false)))
        .get();
      if (!row) return null;
      const exp = db.select({ expiresAt: adminSessions.expiresAt }).from(adminSessions).where(eq(adminSessions.id, id)).get();
      if (!exp || exp.expiresAt <= nowIso) return null;
      return row;
    },
    async revoke(id) {
      db.update(adminSessions).set({ revoked: true }).where(eq(adminSessions.id, id)).run();
    },
    async revokeAllFor(loginId) {
      db.update(adminSessions).set({ revoked: true }).where(eq(adminSessions.loginId, loginId)).run();
    },
  };

  return { accounts, sessions };
}