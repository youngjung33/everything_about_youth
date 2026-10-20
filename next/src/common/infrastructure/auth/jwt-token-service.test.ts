import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { InvalidTokenError } from "@/common/application/auth";
import type { Clock } from "@/common/application/system";
import { JoseTokenService } from "./jwt-token-service";

const SECRET = "test-secret-test-secret-test-secret-123";
const config = { secret: SECRET, issuer: "iss", audience: "aud", accessTtlSec: 900, refreshTtlSec: 3600 };

function makeClock(start = "2026-10-18T00:00:00Z") {
  let now = new Date(start);
  const clock: Clock = { now: () => now };
  return { clock, advance: (sec: number) => (now = new Date(now.getTime() + sec * 1000)) };
}

async function rejection(p: Promise<unknown>): Promise<InvalidTokenError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(InvalidTokenError);
    return e as InvalidTokenError;
  }
  throw new Error("거절되어야 합니다");
}

describe("JoseTokenService", () => {
  it("발급한 액세스 토큰을 검증하면 sub 와 종류가 나온다", async () => {
    const { clock } = makeClock();
    const svc = new JoseTokenService(config, clock);
    const issued = await svc.issue("access", "device-1");
    expect(issued.expiresIn).toBe(900);
    const claims = await svc.verify(issued.token, "access");
    expect(claims).toMatchObject({ sub: "device-1", use: "access" });
    expect(claims.jti).toBeTruthy();
  });

  it("만료되면 expired 로 거절한다", async () => {
    const { clock, advance } = makeClock();
    const svc = new JoseTokenService(config, clock);
    const { token } = await svc.issue("access", "d");
    advance(899);
    await expect(svc.verify(token, "access")).resolves.toBeTruthy();
    advance(2);
    expect((await rejection(svc.verify(token, "access"))).reason).toBe("expired");
  });

  it("액세스 토큰을 리프레시로, 리프레시 토큰을 액세스로 쓸 수 없다", async () => {
    const { clock } = makeClock();
    const svc = new JoseTokenService(config, clock);
    const access = await svc.issue("access", "d");
    const refresh = await svc.issue("refresh", "d");
    expect((await rejection(svc.verify(access.token, "refresh"))).reason).toBe("invalid");
    expect((await rejection(svc.verify(refresh.token, "access"))).reason).toBe("invalid");
  });

  it("다른 키로 서명했거나 발급자/대상이 다르면 거절한다", async () => {
    const { clock } = makeClock();
    const svc = new JoseTokenService(config, clock);
    const other = new JoseTokenService({ ...config, secret: "another-secret-another-secret-12345678" }, clock);
    expect((await rejection(svc.verify((await other.issue("access", "d")).token, "access"))).reason).toBe("invalid");

    const wrongIss = new JoseTokenService({ ...config, issuer: "evil" }, clock);
    expect((await rejection(svc.verify((await wrongIss.issue("access", "d")).token, "access"))).reason).toBe("invalid");

    const wrongAud = new JoseTokenService({ ...config, audience: "evil" }, clock);
    expect((await rejection(svc.verify((await wrongAud.issue("access", "d")).token, "access"))).reason).toBe("invalid");
  });

  it("alg 가 none 이거나 HS256 이 아닌 토큰은 거절한다", async () => {
    const { clock } = makeClock();
    const svc = new JoseTokenService(config, clock);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const exp = Math.floor(clock.now().getTime() / 1000) + 600;
    const none = `${b64({ alg: "none" })}.${b64({ sub: "d", use: "access", iss: "iss", aud: "aud", jti: "x", exp })}.`;
    expect((await rejection(svc.verify(none, "access"))).reason).toBe("invalid");

    const hs512 = await new SignJWT({ use: "access" })
      .setProtectedHeader({ alg: "HS512" })
      .setSubject("d")
      .setIssuer("iss")
      .setAudience("aud")
      .setJti("x")
      .setExpirationTime(exp)
      .sign(new TextEncoder().encode(SECRET));
    expect((await rejection(svc.verify(hs512, "access"))).reason).toBe("invalid");
  });

  it("sub/jti 가 없는 토큰이나 쓰레기 문자열은 거절한다", async () => {
    const { clock } = makeClock();
    const svc = new JoseTokenService(config, clock);
    const exp = Math.floor(clock.now().getTime() / 1000) + 600;
    const noSub = await new SignJWT({ use: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("iss")
      .setAudience("aud")
      .setJti("x")
      .setExpirationTime(exp)
      .sign(new TextEncoder().encode(SECRET));
    expect((await rejection(svc.verify(noSub, "access"))).reason).toBe("invalid");
    expect((await rejection(svc.verify("not-a-jwt", "access"))).reason).toBe("invalid");
    expect((await rejection(svc.verify("", "access"))).reason).toBe("invalid");
  });
});
