import type { AuthClientStore } from "@/common/application/auth";
import type { FeatureFlagStore } from "@/common/application/feature-flags";
import type { SsoTicketStore, UserStore } from "@/common/application/sso";
import { SqliteAuthClientStore } from "./sqlite/sqlite-auth-client-store";
import { SqliteFeatureFlagStore } from "./sqlite/sqlite-feature-flag-store";
import { SqliteSsoTicketStore, SqliteUserStore } from "./sqlite/sqlite-user-store";
import { type AppPersistence, requireSqlite } from "./create-persistence";

/** 공통·인증 저장소. 2차 Postgres 구현은 같은 시그니처로 이 함수만 바꾼다. */
export function createAuthClientStore(persistence: AppPersistence): AuthClientStore {
  return new SqliteAuthClientStore(requireSqlite(persistence).db);
}

export function createUserStore(persistence: AppPersistence): UserStore {
  return new SqliteUserStore(requireSqlite(persistence).db);
}

export function createSsoTicketStore(persistence: AppPersistence): SsoTicketStore {
  return new SqliteSsoTicketStore(requireSqlite(persistence).db);
}

export function createFeatureFlagStore(persistence: AppPersistence): FeatureFlagStore {
  return new SqliteFeatureFlagStore(requireSqlite(persistence).db);
}
