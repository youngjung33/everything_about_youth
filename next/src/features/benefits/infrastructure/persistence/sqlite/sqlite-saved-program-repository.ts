import { and, desc, eq, sql } from "drizzle-orm";
import type { SavedProgram, SavedProgramRepository } from "@/features/benefits/application/ports/saved-program-repository";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { savedBenefitPrograms } from "./schema";

export class SqliteSavedProgramRepository implements SavedProgramRepository {
  constructor(private readonly db: SqliteDb) {}

  async list(userId: string): Promise<SavedProgram[]> {
    return this.db
      .select({ programId: savedBenefitPrograms.programId, savedAt: savedBenefitPrograms.createdAt })
      .from(savedBenefitPrograms)
      .where(eq(savedBenefitPrograms.userId, userId))
      .orderBy(desc(savedBenefitPrograms.createdAt))
      .all();
  }

  async isSaved(userId: string, programId: string): Promise<boolean> {
    const row = this.db
      .select({ programId: savedBenefitPrograms.programId })
      .from(savedBenefitPrograms)
      .where(and(eq(savedBenefitPrograms.userId, userId), eq(savedBenefitPrograms.programId, programId)))
      .get();
    return row !== undefined;
  }

  async count(userId: string): Promise<number> {
    const row = this.db
      .select({ n: sql<number>`count(*)` })
      .from(savedBenefitPrograms)
      .where(eq(savedBenefitPrograms.userId, userId))
      .get();
    return Number(row?.n ?? 0);
  }

  async save(userId: string, programId: string, savedAt: string): Promise<void> {
    this.db.insert(savedBenefitPrograms).values({ userId, programId, createdAt: savedAt }).onConflictDoNothing().run();
  }

  async remove(userId: string, programId: string): Promise<void> {
    this.db.delete(savedBenefitPrograms).where(and(eq(savedBenefitPrograms.userId, userId), eq(savedBenefitPrograms.programId, programId))).run();
  }
}
