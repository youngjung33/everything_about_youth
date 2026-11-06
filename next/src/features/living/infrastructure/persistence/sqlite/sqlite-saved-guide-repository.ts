import { and, desc, eq, sql } from "drizzle-orm";
import type { SavedGuide, SavedGuideRepository } from "@/features/living/application/ports/saved-guide-repository";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { savedLivingGuides } from "./schema";

export class SqliteSavedGuideRepository implements SavedGuideRepository {
  constructor(private readonly db: SqliteDb) {}

  async list(userId: string): Promise<SavedGuide[]> {
    return this.db
      .select({ guideId: savedLivingGuides.guideId, savedAt: savedLivingGuides.createdAt })
      .from(savedLivingGuides)
      .where(eq(savedLivingGuides.userId, userId))
      .orderBy(desc(savedLivingGuides.createdAt))
      .all();
  }

  async isSaved(userId: string, guideId: string): Promise<boolean> {
    const row = this.db
      .select({ guideId: savedLivingGuides.guideId })
      .from(savedLivingGuides)
      .where(and(eq(savedLivingGuides.userId, userId), eq(savedLivingGuides.guideId, guideId)))
      .get();
    return row !== undefined;
  }

  async count(userId: string): Promise<number> {
    const row = this.db
      .select({ n: sql<number>`count(*)` })
      .from(savedLivingGuides)
      .where(eq(savedLivingGuides.userId, userId))
      .get();
    return Number(row?.n ?? 0);
  }

  async save(userId: string, guideId: string, savedAt: string): Promise<void> {
    this.db.insert(savedLivingGuides).values({ userId, guideId, createdAt: savedAt }).onConflictDoNothing().run();
  }

  async remove(userId: string, guideId: string): Promise<void> {
    this.db.delete(savedLivingGuides).where(and(eq(savedLivingGuides.userId, userId), eq(savedLivingGuides.guideId, guideId))).run();
  }
}
