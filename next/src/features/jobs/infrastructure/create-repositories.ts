import type { JobPostingRepository } from "../application/ports/posting-repository";
import type { SavedJobPostingRepository } from "../application/ports/saved-posting-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { type AppPersistence, requireSqlite } from "@/common/infrastructure/persistence/create-persistence";
import { SqliteJobPostingRepository } from "./persistence/sqlite/sqlite-posting-repository";
import { SqliteSavedJobPostingRepository } from "./persistence/sqlite/sqlite-saved-posting-repository";
import { SqliteSyncRunRepository } from "./persistence/sqlite/sqlite-sync-run-repository";

export function createJobsRepositories(persistence: AppPersistence): {
  postings: JobPostingRepository;
  savedPostings: SavedJobPostingRepository;
  syncRuns: SyncRunRepository;
} {
  const db = requireSqlite(persistence).db;
  return {
    postings: new SqliteJobPostingRepository(db),
    savedPostings: new SqliteSavedJobPostingRepository(db),
    syncRuns: new SqliteSyncRunRepository(db),
  };
}
