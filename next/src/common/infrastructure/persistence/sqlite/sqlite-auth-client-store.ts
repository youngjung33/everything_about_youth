import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import type { AuthClient, AuthClientStore, GuestSessionPruneOptions } from "@/common/application/auth";
import type { SqliteDb } from "./client";
import { authClients } from "./schema";

export class SqliteAuthClientStore implements AuthClientStore {
  constructor(private readonly db: SqliteDb) {}

  async create(id: string, at: string, userId?: string): Promise<void> {
    this.db
      .insert(authClients)
      .values({ id, createdAt: at, lastSeenAt: at, revoked: false, userId: userId ?? null })
      .run();
  }

  async find(id: string): Promise<AuthClient | null> {
    const row = this.db.select().from(authClients).where(eq(authClients.id, id)).get();
    return row ? { id: row.id, revoked: row.revoked, userId: row.userId } : null;
  }

  async touch(id: string, at: string): Promise<void> {
    this.db.update(authClients).set({ lastSeenAt: at }).where(eq(authClients.id, id)).run();
  }

  async revoke(id: string): Promise<boolean> {
    const result = this.db.update(authClients).set({ revoked: true }).where(eq(authClients.id, id)).run();
    return result.changes > 0;
  }

  async revokeByUser(userId: string): Promise<number> {
    return this.db.update(authClients).set({ revoked: true }).where(eq(authClients.userId, userId)).run().changes;
  }

  async pruneGuestSessions(options: GuestSessionPruneOptions): Promise<number> {
    let deleted = 0;
    deleted += this.db
      .delete(authClients)
      .where(and(isNull(authClients.userId), lt(authClients.lastSeenAt, options.olderThanIso)))
      .run().changes;

    const countRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(authClients)
      .where(isNull(authClients.userId))
      .get();
    const count = countRow?.count ?? 0;
    if (count <= options.maxRows) return deleted;

    const excess = count - options.maxRows;
    const stale = this.db
      .select({ id: authClients.id })
      .from(authClients)
      .where(isNull(authClients.userId))
      .orderBy(asc(authClients.lastSeenAt))
      .limit(excess)
      .all();
    for (const row of stale) {
      deleted += this.db.delete(authClients).where(eq(authClients.id, row.id)).run().changes;
    }
    return deleted;
  }
}
