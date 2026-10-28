import { consoleLogger, systemClock, type Clock, type Logger } from "@/common/application/system";
import { loadConfig, type AppConfig } from "./config/env";
import { createPersistence, requireSqlite, type AppPersistence } from "./persistence/create-persistence";
import type { SqliteConnection } from "./persistence/sqlite/client";

/**
 * 모든 섹션이 공유하는 의존성(설정, 시계, 로거, DB 연결).
 * 각 섹션(features/*)의 container 가 이것을 받아 자기 리포지토리/유스케이스를 조립한다.
 *
 * 2차: `persistence.driver === "supabase"` 일 때 Postgres 는 각 섹션 `infrastructure/create-repositories.ts` 등에서 선택한다.
 */
export interface CommonContainer {
  config: AppConfig;
  clock: Clock;
  logger: Logger;
  persistence: AppPersistence;
  close(): void;
}

export interface CommonOverrides {
  config?: Partial<AppConfig>;
  logger?: Logger;
  clock?: Clock;
  persistence?: AppPersistence;
}

export function createCommonContainer(overrides: CommonOverrides = {}): CommonContainer {
  const config = { ...loadConfig(), ...overrides.config };
  const logger = overrides.logger ?? consoleLogger;
  const clock = overrides.clock ?? systemClock;
  const persistence = overrides.persistence ?? createPersistence(config);

  return {
    config,
    clock,
    logger,
    persistence,
    close: () => {
      if (persistence.driver === "sqlite") persistence.sqlite.close();
    },
  };
}

/** 1차 SQLite 전용. 2차 Postgres 경로에서는 호출하지 않는다. */
export function sqliteOf(common: CommonContainer): SqliteConnection {
  return requireSqlite(common.persistence);
}

const globalKey = Symbol.for("everything_about_youth.common-container");
type GlobalWithContainer = typeof globalThis & { [globalKey]?: CommonContainer };

/** Next.js 개발 모드의 HMR 에서도 DB 연결을 하나만 유지한다. */
export function getCommonContainer(): CommonContainer {
  const g = globalThis as GlobalWithContainer;
  if (!g[globalKey]) g[globalKey] = createCommonContainer();
  return g[globalKey]!;
}
