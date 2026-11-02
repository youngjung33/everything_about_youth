import type { SchemeRepository } from "../application/ports/scheme-repository";
import type { SavedSchemeRepository } from "../application/ports/saved-scheme-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { type AppPersistence, requireSqlite } from "@/common/infrastructure/persistence/create-persistence";
import { SqliteSchemeRepository } from "./persistence/sqlite/sqlite-scheme-repository";
import { SqliteSavedSchemeRepository } from "./persistence/sqlite/sqlite-saved-scheme-repository";
import { SqliteSyncRunRepository } from "./persistence/sqlite/sqlite-sync-run-repository";

export function createFinanceRepositories(persistence: AppPersistence): {
  schemes: SchemeRepository;
  savedSchemes: SavedSchemeRepository;
  syncRuns: SyncRunRepository;
} {
  const db = requireSqlite(persistence).db;
  return {
    schemes: new SqliteSchemeRepository(db),
    savedSchemes: new SqliteSavedSchemeRepository(db),
    syncRuns: new SqliteSyncRunRepository(db),
  };
}
