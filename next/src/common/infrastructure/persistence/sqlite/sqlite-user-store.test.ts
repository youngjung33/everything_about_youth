import { beforeEach, describe, expect, it } from "vitest";
import { openSqlite, runMigrations, type SqliteConnection } from "./client";
import { SqliteAuthClientStore } from "./sqlite-auth-client-store";
import { SqliteSsoTicketStore, SqliteUserStore } from "./sqlite-user-store";

let conn: SqliteConnection;
let users: SqliteUserStore;
let tickets: SqliteSsoTicketStore;

const count = (table: string) => (conn.raw.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;

beforeEach(() => {
  conn = openSqlite(":memory:");
  runMigrations(conn.db);
  users = new SqliteUserStore(conn.db);
  tickets = new SqliteSsoTicketStore(conn.db);
});

describe("SqliteUserStore", () => {
  it("처음 보는 계정은 회원을 만들고, 다시 오면 같은 회원이다", async () => {
    const a = await users.findOrCreate("google", "g1", "2026-10-21T00:00:00Z", () => "u1");
    const again = await users.findOrCreate("google", "g1", "2026-10-22T00:00:00Z", () => "should-not-be-used");
    expect(a).toBe("u1");
    expect(again).toBe("u1");
    expect(count("users")).toBe(1);
    expect(conn.raw.prepare("select last_login_at from users").get()).toEqual({ last_login_at: "2026-10-22T00:00:00Z" });
  });

  it("같은 번호라도 업체가 다르면 다른 회원이다 (업체 사이 계정 연결은 하지 않는다)", async () => {
    const g = await users.findOrCreate("google", "123", "t", () => "u-g");
    const k = await users.findOrCreate("kakao", "123", "t", () => "u-k");
    expect(g).not.toBe(k);
    expect(count("user_identities")).toBe(2);
  });

  it("저장하는 정보는 업체와 고유 번호뿐이다 (이메일·이름 열이 없다)", () => {
    const columns = (table: string) =>
      (conn.raw.prepare(`pragma table_info(${table})`).all() as { name: string }[]).map((c) => c.name).sort();
    expect(columns("users")).toEqual(["created_at", "id", "last_login_at"]);
    expect(columns("user_identities")).toEqual(["created_at", "provider", "subject", "user_id"]);
  });

  it("삭제하면 로그인 정보와 남은 티켓이 함께 지워지고, 세션 기록은 남지만 회원과의 연결이 끊긴다", async () => {
    const clients = new SqliteAuthClientStore(conn.db);
    const id = await users.findOrCreate("naver", "n1", "t", () => "u1");
    await clients.create("session-1", "2026-10-21T00:00:00Z", id);
    await tickets.create("hash", id, "challenge", "2999-01-01T00:00:00Z", "2026-10-21T00:00:00Z");

    await users.delete(id);

    expect(count("users")).toBe(0);
    expect(count("user_identities")).toBe(0);
    expect(count("sso_tickets")).toBe(0);
    expect(await clients.find("session-1")).toEqual({ id: "session-1", revoked: false, userId: null });
  });

  it("없는 회원을 지워도 오류가 아니다", async () => {
    await expect(users.delete("nobody")).resolves.toBeUndefined();
  });
});

describe("SqliteSsoTicketStore", () => {
  const NOW = "2026-10-21T00:00:00.000Z";
  const LATER = "2026-10-21T00:02:00.000Z";

  async function seed() {
    return users.findOrCreate("google", "g1", NOW, () => "u1");
  }

  it("한 번 꺼내면 사라진다", async () => {
    const userId = await seed();
    await tickets.create("h1", userId, "ch", LATER, NOW);
    expect(await tickets.consume("h1", NOW)).toEqual({ userId: "u1", challenge: "ch" });
    expect(await tickets.consume("h1", NOW)).toBeNull();
  });

  it("만료된 티켓은 꺼낼 수 없고, 꺼내는 순간 지워진다", async () => {
    const userId = await seed();
    await tickets.create("h1", userId, "ch", LATER, NOW);
    expect(await tickets.consume("h1", LATER)).toBeNull();
    expect(count("sso_tickets")).toBe(0);
  });

  it("모르는 티켓은 null", async () => {
    expect(await tickets.consume("nope", NOW)).toBeNull();
  });

  it("새 티켓을 만들 때 만료된 티켓을 치운다", async () => {
    const userId = await seed();
    await tickets.create("old", userId, "ch", LATER, NOW);
    await tickets.create("new", userId, "ch", "2026-10-21T01:00:00.000Z", "2026-10-21T00:30:00.000Z");
    expect(count("sso_tickets")).toBe(1);
    expect(await tickets.consume("new", "2026-10-21T00:30:00.000Z")).not.toBeNull();
  });

  it("존재하지 않는 회원의 티켓은 만들 수 없다 (외래 키)", async () => {
    await expect(tickets.create("h", "ghost", "ch", LATER, NOW)).rejects.toBeDefined();
  });
});
