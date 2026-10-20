import { consoleLogger, systemClock, type Clock, type Logger } from "@/common/application/system";
import { loadConfig, type AppConfig } from "./config/env";
import { openSqlite, runMigrations, type SqliteConnection } from "./persistence/sqlite/client";

/**
 * 모든 섹션이 공유하는 의존성(설정, 시계, 로거, DB 연결).
 * 각 섹션(features/*)의 container 가 이것을 받아 자기 리포지토리/유스케이스를 조립한다.
 *
 * 2차에 Supabase 를 붙일 때는 DB_DRIVER=supabase 분기에서 연결을 만들고,
 * 각 섹션 container 가 그 연결로 Postgres 리포지토리를 조립하도록 바꾼다.
 */
export interface CommonContainer {
  config: AppConfig;
  clock: Clock;
  logger: Logger;
  sqlite: SqliteConnection;
  close(): void;
}

export interface CommonOverrides {
  config?: Partial<AppConfig>;
  logger?: Logger;
  clock?: Clock;
  sqlite?: SqliteConnection;
}

export function createCommonContainer(overrides: CommonOverrides = {}): CommonContainer {
  const config = { ...loadConfig(), ...overrides.config };
  const logger = overrides.logger ?? consoleLogger;
  const clock = overrides.clock ?? systemClock;

  if (config.dbDriver !== "sqlite") {
    throw new Error("DB_DRIVER=supabase 는 2차 개발 범위입니다. 1차에서는 sqlite 만 지원합니다.");
  }
  const sqlite = overrides.sqlite ?? openSqlite(config.sqlitePath);
  runMigrations(sqlite.db);

  return { config, clock, logger, sqlite, close: () => sqlite.close() };
}

const globalKey = Symbol.for("everything_about_youth.common-container");
type GlobalWithContainer = typeof globalThis & { [globalKey]?: CommonContainer };

/** Next.js 개발 모드의 HMR 에서도 DB 연결을 하나만 유지한다. */
export function getCommonContainer(): CommonContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createCommonContainer();
  return g[globalKey]!;
}
