import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 웹 관리자 로그인 계정(앱 SSO 회원과 별도). */
export const adminAccounts = sqliteTable("admin_accounts", {
  loginId: text("login_id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  isRoot: integer("is_root", { mode: "boolean" }).notNull().default(false),
  permissionsJson: text("permissions_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdBy: text("created_by"),
});

/** 관리자 브라우저 세션. 쿠키 JWT 의 sid 와 같다. */
export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    loginId: text("login_id")
      .notNull()
      .references(() => adminAccounts.loginId, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("admin_sessions_login_idx").on(t.loginId)],
);