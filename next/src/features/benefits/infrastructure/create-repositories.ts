import type { ProgramRepository } from "../application/ports/program-repository";
import type { SavedProgramRepository } from "../application/ports/saved-program-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { type AppPersistence, requireSqlite } from "@/common/infrastructure/persistence/create-persistence";
import { SqliteProgramRepository } from "./persistence/sqlite/sqlite-program-repository";
import { SqliteSavedProgramRepository } from "./persistence/sqlite/sqlite-saved-program-repository";
import { SqliteSyncRunRepository } from "./persistence/sqlite/sqlite-sync-run-repository";

export function createBenefitsRepositories(persistence: AppPersistence): {
  programs: ProgramRepository;
  savedPrograms: SavedProgramRepository;
  syncRuns: SyncRunRepository;
} {
  const db = requireSqlite(persistence).db;
  return {
    programs: new SqliteProgramRepository(db),
    savedPrograms: new SqliteSavedProgramRepository(db),
    syncRuns: new SqliteSyncRunRepository(db),
  };
}
