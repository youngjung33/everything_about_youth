import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 서비스 켜기/끄기에서 운영자가 바꾼 값. 행이 없으면 코드의 기본값을 쓴다. (섹션과 무관한 공용 테이블) */
export const featureFlags = sqliteTable("feature_flags", {
  id: text("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** 회원. SSO 로 로그인한 사람 한 명. (자체 아이디/비밀번호는 없다) */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at").notNull(),
});

/**
 * 로그인 업체(google/apple/naver/kakao)의 계정과 회원의 연결. 업체가 정해 준 고유 번호(subject)만 저장한다.
 * 이메일·이름은 받지 않는다. (필요해지면 `FieldCipher` 로 암호화해서 컬럼을 추가한다)
 */
export const userIdentities = sqliteTable(
  "user_identities",
  {
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.subject] }), index("user_identities_user_idx").on(t.userId)],
);

/**
 * 서버가 발급한 세션 식별자. JWT 의 sub 와 같고, revoked 면 토큰 갱신이 거절된다.
 * userId 가 있으면 SSO 로그인한 회원의 세션이고, 없으면 비회원 세션이다.
 */
export const authClients = sqliteTable("auth_clients", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
});

/** SSO 로그인 직후 만드는 일회용 티켓. 티켓 자체가 아니라 SHA-256 값만 저장한다. 한 번 쓰면 지워진다. */
export const ssoTickets = sqliteTable("sso_tickets", {
  ticketHash: text("ticket_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  challenge: text("challenge").notNull(),
  expiresAt: text("expires_at").notNull(),
});
