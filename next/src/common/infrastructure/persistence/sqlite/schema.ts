import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 서비스 켜기/끄기에서 운영자가 바꾼 값. 행이 없으면 코드의 기본값을 쓴다. (섹션과 무관한 공용 테이블) */
export const featureFlags = sqliteTable("feature_flags", {
  id: text("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** 서버가 발급한 기기(설치) 식별자. JWT 의 sub 와 같고, revoked 면 토큰 갱신이 거절된다. */
export const authClients = sqliteTable("auth_clients", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
});
