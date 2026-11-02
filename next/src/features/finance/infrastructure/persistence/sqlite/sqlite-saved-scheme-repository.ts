import { and, desc, eq, sql } from "drizzle-orm";
import type { SavedScheme, SavedSchemeRepository } from "@/features/finance/application/ports/saved-scheme-repository";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { savedFinanceSchemes } from "./schema";

export class SqliteSavedSchemeRepository implements SavedSchemeRepository {
  constructor(private readonly db: SqliteDb) {}

  async list(userId: string): Promise<SavedScheme[]> {
    return this.db
      .select({ schemeId: savedFinanceSchemes.schemeId, savedAt: savedFinanceSchemes.createdAt })
      .from(savedFinanceSchemes)
      .where(eq(savedFinanceSchemes.userId, userId))
      .orderBy(desc(savedFinanceSchemes.createdAt))
      .all();
  }

  async isSaved(userId: string, schemeId: string): Promise<boolean> {
    const row = this.db
      .select({ schemeId: savedFinanceSchemes.schemeId })
      .from(savedFinanceSchemes)
      .where(and(eq(savedFinanceSchemes.userId, userId), eq(savedFinanceSchemes.schemeId, schemeId)))
      .get();
    return row !== undefined;
  }

  async count(userId: string): Promise<number> {
    const row = this.db
      .select({ n: sql<number>`count(*)` })
      .from(savedFinanceSchemes)
      .where(eq(savedFinanceSchemes.userId, userId))
      .get();
    return Number(row?.n ?? 0);
  }

  async save(userId: string, schemeId: string, savedAt: string): Promise<void> {
    this.db.insert(savedFinanceSchemes).values({ userId, schemeId, createdAt: savedAt }).onConflictDoNothing().run();
  }

  async remove(userId: string, schemeId: string): Promise<void> {
    this.db.delete(savedFinanceSchemes).where(and(eq(savedFinanceSchemes.userId, userId), eq(savedFinanceSchemes.schemeId, schemeId))).run();
  }
}
