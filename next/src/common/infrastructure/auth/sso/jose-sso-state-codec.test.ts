import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import type { SsoState } from "@/common/application/sso";
import { JoseSsoStateCodec, STATE_TTL_SEC } from "./jose-sso-state-codec";

const SECRET = "test-secret-test-secret-test-secret-123";
const state: SsoState = {
  provider: "kakao",
  nonce: "n",
  appRedirect: "everythingaboutyouth://auth",
  challenge: "c".repeat(43),
  callbackUri: "https://api.test/cb",
};

function setup() {
  let now = new Date("2026-10-21T00:00:00Z");
  return {
    codec: new JoseSsoStateCodec(SECRET, "iss", { now: () => now }),
    advance: (sec: number) => (now = new Date(now.getTime() + sec * 1000)),
    clock: { now: () => now },
  };
}

describe("JoseSsoStateCodec", () => {
  it("서명한 state 를 그대로 복원한다", async () => {
    const { codec } = setup();
    expect(await codec.verify(await codec.sign(state))).toEqual(state);
  });

  it("유효 시간이 지나면 거절한다", async () => {
    const { codec, advance } = setup();
    const token = await codec.sign(state);
    advance(STATE_TTL_SEC - 1);
    await expect(codec.verify(token)).resolves.toBeDefined();
    advance(2);
    await expect(codec.verify(token)).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("내용을 바꾸거나 다른 키로 서명하면 거절한다", async () => {
    const { codec } = setup();
    const [h, p, s] = (await codec.sign(state)).split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), appRedirect: "https://evil.com" })).toString("base64url");
    await expect(codec.verify(`${h}.${forgedPayload}.${s}`)).rejects.toMatchObject({ code: "invalid_state" });

    const other = new JoseSsoStateCodec("another-secret-another-secret-12345", "iss", { now: () => new Date("2026-10-21T00:00:00Z") });
    await expect(codec.verify(await other.sign(state))).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("같은 키로 만든 다른 용도의 토큰(액세스 토큰 등)은 state 로 쓸 수 없다", async () => {
    const { codec, clock } = setup();
    const nowSec = Math.floor(clock.now().getTime() / 1000);
    const accessLike = await new SignJWT({ ...state })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("iss")
      .setAudience("aud") // state 의 대상이 아니다
      .setIssuedAt(nowSec)
      .setExpirationTime(nowSec + 600)
      .sign(new TextEncoder().encode(SECRET));
    await expect(codec.verify(accessLike)).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("필수 값이 빠졌거나 알 수 없는 업체면 거절한다", async () => {
    const { codec, clock } = setup();
    const nowSec = Math.floor(clock.now().getTime() / 1000);
    const make = (claims: Record<string, unknown>) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("iss")
        .setAudience("sso-state")
        .setIssuedAt(nowSec)
        .setExpirationTime(nowSec + 600)
        .sign(new TextEncoder().encode(SECRET));
    await expect(codec.verify(await make({ ...state, provider: "facebook" }))).rejects.toMatchObject({ code: "invalid_state" });
    await expect(codec.verify(await make({ provider: "google" }))).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("쓰레기 입력은 거절한다", async () => {
    const { codec } = setup();
    for (const bad of ["", "a.b.c", "garbage"]) await expect(codec.verify(bad)).rejects.toMatchObject({ code: "invalid_state" });
  });
});
