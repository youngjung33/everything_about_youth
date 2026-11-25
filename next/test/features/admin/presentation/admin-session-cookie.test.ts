import { describe, expect, it } from "vitest";
import { loadAuthConfig } from "@/common/infrastructure/config/auth-config";
import { parseAdminSessionCookie, signAdminSessionCookie } from "@/features/admin/presentation/admin-session-cookie";

describe("admin-session-cookie", () => {
  const auth = loadAuthConfig({ NODE_ENV: "test" });
  const secret = new TextEncoder().encode(auth.secret);
  const audience = `${auth.audience}-admin`;

  it("깨진 JWT 는 null", async () => {
    expect(await parseAdminSessionCookie("not-a-jwt", secret, auth.issuer, audience)).toBeNull();
    expect(await parseAdminSessionCookie(undefined, secret, auth.issuer, audience)).toBeNull();
  });

  it("서명 후 파싱이 loginId·role·sid 를 복원한다", async () => {
    const exp = "2030-01-01T00:00:00.000Z";
    const token = await signAdminSessionCookie(
      { sid: "sid-abc", loginId: "ADMIN", role: "super" },
      secret,
      auth.issuer,
      audience,
      exp,
    );
    const payload = await parseAdminSessionCookie(token, secret, auth.issuer, audience);
    expect(payload).toEqual({ sid: "sid-abc", loginId: "ADMIN", role: "super" });
  });

  it("audience 가 다르면 null", async () => {
    const token = await signAdminSessionCookie(
      { sid: "s", loginId: "a", role: "viewer" },
      secret,
      auth.issuer,
      audience,
      "2030-01-01T00:00:00.000Z",
    );
    expect(await parseAdminSessionCookie(token, secret, auth.issuer, "wrong-audience")).toBeNull();
  });
});