import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

/** 섹션(feature)별 스키마와 무관한 공용 DB 핸들. 각 섹션의 리포지토리가 자기 테이블만 사용한다. */
export type SqliteDb = BetterSQLite3Database;

export interface SqliteConnection {
  db: SqliteDb;
  raw: Database.Database;
  close(): void;
}

/** 모든 섹션의 마이그레이션이 하나의 폴더(drizzle/)에 순서대로 쌓인다. */
export const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

export function openSqlite(filePath: string): SqliteConnection {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  const raw = new Database(filePath);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");
  const db = drizzle(raw);
  return { db, raw, close: () => raw.close() };
}

export function runMigrations(db: SqliteDb, folder: string = MIGRATIONS_FOLDER): void {
  migrate(db, { migrationsFolder: folder });
}
