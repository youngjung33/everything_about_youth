import { describe, expect, it } from "vitest";
import { AuthError, AuthService, InvalidTokenError } from "@/common/application/auth";
import type { Clock } from "@/common/application/system";
import { openSqlite, runMigrations } from "../persistence/sqlite/client";
import { SqliteAuthClientStore } from "../persistence/sqlite/sqlite-auth-client-store";
import { SqliteUserStore } from "../persistence/sqlite/sqlite-user-store";
import { JoseTokenService } from "./jwt-token-service";

const config = {
  secret: "test-secret-test-secret-test-secret-123",
  issuer: "iss",
  audience: "aud",
  accessTtlSec: 900,
  refreshTtlSec: 3600,
};

/** 실제 JWT + 실제 SQLite(in-memory) 로 세션 흐름 전체를 검증한다. */
function setup() {
  let now = new Date("2026-10-18T00:00:00Z");
  const clock: Clock = { now: () => now };
  const conn = openSqlite(":memory:");
  runMigrations(conn.db);
  const tokens = new JoseTokenService(config, clock);
  const store = new SqliteAuthClientStore(conn.db);
  let n = 0;
  const auth = new AuthService(tokens, store, clock, () => `device-${++n}`);
  return { auth, tokens, store, conn, advance: (sec: number) => (now = new Date(now.getTime() + sec * 1000)) };
}

describe("AuthService + 실제 JWT/SQLite", () => {
  it("세션을 시작하면 서버가 기기 id 를 만들어 토큰에 넣는다", async () => {
    const { auth, tokens, store } = setup();
    const s = await auth.startSession();
    expect(s.tokenType).toBe("Bearer");
    expect(s.accessExpiresIn).toBe(900);
    expect(s.refreshExpiresIn).toBe(3600);
    expect((await tokens.verify(s.accessToken, "access")).sub).toBe("device-1");
    expect(await store.find("device-1")).toEqual({ id: "device-1", revoked: false, userId: null });
    expect(s.member).toBe(false);

    const s2 = await auth.startSession();
    expect((await tokens.verify(s2.accessToken, "access")).sub).toBe("device-2");
  });

  it("리프레시하면 같은 기기 id 로 새 토큰 쌍을 준다", async () => {
    const { auth, tokens, advance } = setup();
    const s = await auth.startSession();
    advance(1000); // 액세스는 이미 만료, 리프레시는 유효
    await expect(tokens.verify(s.accessToken, "access")).rejects.toBeInstanceOf(InvalidTokenError);

    const next = await auth.refresh(s.refreshToken);
    expect((await tokens.verify(next.accessToken, "access")).sub).toBe("device-1");
    expect(next.accessToken).not.toBe(s.accessToken);
  });

  it("액세스 토큰으로는 리프레시할 수 없다", async () => {
    const { auth } = setup();
    const s = await auth.startSession();
    await expect(auth.refresh(s.accessToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("리프레시 토큰이 만료되면 거절한다", async () => {
    const { auth, advance } = setup();
    const s = await auth.startSession();
    advance(3601);
    await expect(auth.refresh(s.refreshToken)).rejects.toMatchObject({ reason: "expired" });
  });

  it("폐기한 기기는 갱신이 거절된다", async () => {
    const { auth } = setup();
    const s = await auth.startSession();
    expect(await auth.revoke("device-1")).toBe(true);
    await expect(auth.refresh(s.refreshToken)).rejects.toBeInstanceOf(AuthError);
    expect(await auth.revoke("nobody")).toBe(false);
  });

  it("회원 세션은 member 로 표시되고, 갱신해도 회원으로 유지된다", async () => {
    const { auth, store, conn, advance } = setup();
    const userId = await new SqliteUserStore(conn.db).findOrCreate("google", "g1", "2026-10-18T00:00:00Z", () => "user-1");

    const s = await auth.startUserSession(userId);
    expect(s.member).toBe(true);
    expect(await store.find("device-1")).toEqual({ id: "device-1", revoked: false, userId: "user-1" });

    advance(1000);
    const next = await auth.refresh(s.refreshToken);
    expect(next.member).toBe(true);
  });

  it("서버가 모르는 기기(DB 초기화 등)의 토큰은 갱신이 거절된다", async () => {
    const a = setup();
    const b = setup(); // 같은 키, 다른 DB
    const s = await a.auth.startSession();
    await expect(b.auth.refresh(s.refreshToken)).rejects.toBeInstanceOf(AuthError);
  });
});
