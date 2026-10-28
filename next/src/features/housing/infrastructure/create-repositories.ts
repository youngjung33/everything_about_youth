import type { NoticeRepository } from "../application/ports/notice-repository";
import type { SavedNoticeRepository } from "../application/ports/saved-notice-repository";
import type { SyncRunRepository } from "../application/ports/sync-run-repository";
import { type AppPersistence, requireSqlite } from "@/common/infrastructure/persistence/create-persistence";
import { SqliteNoticeRepository } from "./persistence/sqlite/sqlite-notice-repository";
import { SqliteSavedNoticeRepository } from "./persistence/sqlite/sqlite-saved-notice-repository";
import { SqliteSyncRunRepository } from "./persistence/sqlite/sqlite-sync-run-repository";

/** 임대주택 SQLite 리포지토리. 2차 Postgres 는 이 함수만 housing 쪽에서 분기한다. */
export function createHousingRepositories(persistence: AppPersistence): {
  notices: NoticeRepository;
  savedNotices: SavedNoticeRepository;
  syncRuns: SyncRunRepository;
} {
  const db = requireSqlite(persistence).db;
  return {
    notices: new SqliteNoticeRepository(db),
    savedNotices: new SqliteSavedNoticeRepository(db),
    syncRuns: new SqliteSyncRunRepository(db),
  };
}
