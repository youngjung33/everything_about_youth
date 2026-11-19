import type { GuideRepository } from "../application/ports/guide-repository";
import type { SavedGuideRepository } from "../application/ports/saved-guide-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { type AppPersistence, requireSqlite } from "@/common/infrastructure/persistence/create-persistence";
import { SqliteGuideRepository } from "./persistence/sqlite/sqlite-guide-repository";
import { SqliteSavedGuideRepository } from "./persistence/sqlite/sqlite-saved-guide-repository";
import { SqliteSyncRunRepository } from "./persistence/sqlite/sqlite-sync-run-repository";

/** 생활정보 SQLite 리포지토리. 2차 Postgres 는 이 함수만 living 쪽에서 분기한다. */
export function createLivingRepositories(persistence: AppPersistence): {
  guides: GuideRepository;
  savedGuides: SavedGuideRepository;
  syncRuns: SyncRunRepository;
} {
  const db = requireSqlite(persistence).db;
  return {
    guides: new SqliteGuideRepository(db),
    savedGuides: new SqliteSavedGuideRepository(db),
    syncRuns: new SqliteSyncRunRepository(db),
  };
}
