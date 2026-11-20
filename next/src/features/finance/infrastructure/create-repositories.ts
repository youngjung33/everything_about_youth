import type { SchemeRepository } from "../application/ports/scheme-repository";
import type { SavedSchemeRepository } from "../application/ports/saved-scheme-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { type AppPersistence, requireSqlite } from "@/common/infrastructure/persistence/create-persistence";
import { SqliteSchemeRepository } from "./persistence/sqlite/sqlite-scheme-repository";
import { SqliteSavedSchemeRepository } from "./persistence/sqlite/sqlite-saved-scheme-repository";
import { SqliteSyncRunRepository } from "./persistence/sqlite/sqlite-sync-run-repository";

/** 금융·자금 SQLite 리포지토리. 2차 Postgres 는 이 함수만 finance 쪽에서 분기한다. */
export function createFinanceRepositories(persistence: AppPersistence): {
  schemes: SchemeRepository; // schemes
  savedSchemes: SavedSchemeRepository; // savedSchemes
  syncRuns: SyncRunRepository; // syncRuns
} {
  const db = requireSqlite(persistence).db;
  return {
    schemes: new SqliteSchemeRepository(db),
    savedSchemes: new SqliteSavedSchemeRepository(db),
    syncRuns: new SqliteSyncRunRepository(db),
  };
}
