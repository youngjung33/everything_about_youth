import { and, desc, eq, sql } from "drizzle-orm";
import type { SavedPosting, SavedJobPostingRepository } from "@/features/jobs/application/ports/saved-posting-repository";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { savedJobPostings } from "./schema";

export class SqliteSavedJobPostingRepository implements SavedJobPostingRepository {
  constructor(private readonly db: SqliteDb) {}

  async list(userId: string): Promise<SavedPosting[]> {
    return this.db
      .select({ postingId: savedJobPostings.postingId, savedAt: savedJobPostings.createdAt })
      .from(savedJobPostings)
      .where(eq(savedJobPostings.userId, userId))
      .orderBy(desc(savedJobPostings.createdAt))
      .all();
  }

  async isSaved(userId: string, postingId: string): Promise<boolean> {
    const row = this.db
      .select({ postingId: savedJobPostings.postingId })
      .from(savedJobPostings)
      .where(and(eq(savedJobPostings.userId, userId), eq(savedJobPostings.postingId, postingId)))
      .get();
    return row !== undefined;
  }

  async count(userId: string): Promise<number> {
    const row = this.db
      .select({ n: sql<number>`count(*)` })
      .from(savedJobPostings)
      .where(eq(savedJobPostings.userId, userId))
      .get();
    return Number(row?.n ?? 0);
  }

  async save(userId: string, postingId: string, savedAt: string): Promise<void> {
    this.db.insert(savedJobPostings).values({ userId, postingId, createdAt: savedAt }).onConflictDoNothing().run();
  }

  async remove(userId: string, postingId: string): Promise<void> {
    this.db.delete(savedJobPostings).where(and(eq(savedJobPostings.userId, userId), eq(savedJobPostings.postingId, postingId))).run();
  }
}
