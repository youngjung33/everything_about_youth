import { and, desc, eq, sql } from "drizzle-orm";
import type { SavedNotice, SavedNoticeRepository } from "@/features/housing/application/ports/saved-notice-repository";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { savedNotices } from "./schema";

export class SqliteSavedNoticeRepository implements SavedNoticeRepository {
  constructor(private readonly db: SqliteDb) {}

  async list(userId: string): Promise<SavedNotice[]> {
    return this.db
      .select({ noticeId: savedNotices.noticeId, savedAt: savedNotices.createdAt })
      .from(savedNotices)
      .where(eq(savedNotices.userId, userId))
      .orderBy(desc(savedNotices.createdAt))
      .all();
  }

  async isSaved(userId: string, noticeId: string): Promise<boolean> {
    const row = this.db
      .select({ noticeId: savedNotices.noticeId })
      .from(savedNotices)
      .where(and(eq(savedNotices.userId, userId), eq(savedNotices.noticeId, noticeId)))
      .get();
    return row !== undefined;
  }

  async count(userId: string): Promise<number> {
    const row = this.db
      .select({ n: sql<number>`count(*)` })
      .from(savedNotices)
      .where(eq(savedNotices.userId, userId))
      .get();
    return Number(row?.n ?? 0);
  }

  async save(userId: string, noticeId: string, savedAt: string): Promise<void> {
    this.db.insert(savedNotices).values({ userId, noticeId, createdAt: savedAt }).onConflictDoNothing().run();
  }

  async remove(userId: string, noticeId: string): Promise<void> {
    this.db.delete(savedNotices).where(and(eq(savedNotices.userId, userId), eq(savedNotices.noticeId, noticeId))).run();
  }
}
