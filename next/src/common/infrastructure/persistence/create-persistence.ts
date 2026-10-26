import type { AppConfig } from "../config/env";
import { openSqlite, runMigrations, type SqliteConnection } from "./sqlite/client";

export type DbDriver = AppConfig["dbDriver"];

/** 1차: SQLite 파일. 2차: `supabase` = Supabase 호스팅 Postgres(인증·RLS 없음, Next service role). */
export type SqliteAppPersistence = {
  driver: "sqlite";
  sqlite: SqliteConnection;
};

export type SupabaseAppPersistence = {
  driver: "supabase";
  /** 2차: `SUPABASE_DATABASE_URL` 로 연결. Drizzle Postgres 리포지토리가 여기를 쓴다. */
  databaseUrl: string;
};

export type AppPersistence = SqliteAppPersistence | SupabaseAppPersistence;

export function requireSqlite(persistence: AppPersistence): SqliteConnection {
  if (persistence.driver !== "sqlite") {
    throw new Error("이 코드 경로는 SQLite 1차 전용입니다. Postgres 리포지토리로 교체하세요.");
  }
  return persistence.sqlite;
}

/**
 * DB 연결을 만든다. 마이그레이션은 SQLite 에서만 자동 실행한다.
 * Postgres 는 `persistence/supabase/` 리포지토리와 Supabase SQL 마이그레이션을 2차에 붙인다.
 */
export function createPersistence(config: AppConfig, env: Record<string, string | undefined> = process.env): AppPersistence {
  if (config.dbDriver === "supabase") {
    const url = env.SUPABASE_DATABASE_URL?.trim();
    if (!url) {
      throw new Error("DB_DRIVER=supabase 일 때 SUPABASE_DATABASE_URL(Postgres 연결 문자열)이 필요합니다.");
    }
    throw new Error(
      "DB_DRIVER=supabase(Postgres) 는 2차입니다. `persistence/supabase/` 에 리포지토리를 구현한 뒤 createPersistence 분기를 연결하세요.",
    );
  }

  const sqlite = openSqlite(config.sqlitePath);
  runMigrations(sqlite.db);
  return { driver: "sqlite", sqlite };
}
