import { describe, expect, it } from "vitest";
import { DEFAULT_APP_REDIRECT, loadSsoConfig } from "./sso-config";

describe("loadSsoConfig", () => {
  it("아무것도 없으면 모든 업체가 꺼져 있고, 문제도 아니다 (비회원 조회만 가능한 상태)", () => {
    const c = loadSsoConfig({});
    expect(c.providers).toEqual({});
    expect(c.problems).toEqual([]);
    expect(c.publicBaseUrl).toBeNull();
    expect(c.redirects.allowed).toEqual([DEFAULT_APP_REDIRECT]);
  });

  it("키가 모두 있는 업체만 켜진다", () => {
    const c = loadSsoConfig({
      SSO_GOOGLE_CLIENT_ID: "gid",
      SSO_GOOGLE_CLIENT_SECRET: "gsecret",
      SSO_NAVER_CLIENT_ID: "nid",
      SSO_NAVER_CLIENT_SECRET: "nsecret",
      SSO_KAKAO_CLIENT_ID: "kid",
    });
    expect(Object.keys(c.providers).sort()).toEqual(["google", "kakao", "naver"]);
    expect(c.providers.google).toEqual({ clientId: "gid", clientSecret: "gsecret" });
    expect(c.providers.kakao).toEqual({ clientId: "kid", clientSecret: null });
    expect(c.problems).toEqual([]);
  });

  it("빈 문자열은 없는 것으로 본다 (.env 에 이름만 적어둔 경우)", () => {
    const c = loadSsoConfig({ SSO_GOOGLE_CLIENT_ID: "", SSO_GOOGLE_CLIENT_SECRET: "  ", SSO_KAKAO_CLIENT_ID: "" });
    expect(c.providers).toEqual({});
    expect(c.problems).toEqual([]);
  });

  it("일부만 적힌 업체는 켜지지 않고 문제로 알린다. 값은 문구에 넣지 않는다", () => {
    const c = loadSsoConfig({ SSO_GOOGLE_CLIENT_ID: "gid-secret-looking", SSO_APPLE_CLIENT_ID: "a", SSO_APPLE_TEAM_ID: "t" });
    expect(c.providers).toEqual({});
    expect(c.problems).toHaveLength(2);
    expect(c.problems[0]).toContain("SSO_GOOGLE_CLIENT_SECRET");
    expect(c.problems[1]).toContain("SSO_APPLE_KEY_ID");
    expect(c.problems[1]).toContain("SSO_APPLE_PRIVATE_KEY");
    expect(c.problems.join()).not.toContain("gid-secret-looking");
  });

  it("카카오는 ID 만 있어도 켜지고, SECRET 만 있으면 문제로 알린다", () => {
    expect(loadSsoConfig({ SSO_KAKAO_CLIENT_ID: "k", SSO_KAKAO_CLIENT_SECRET: "s" }).providers.kakao).toEqual({
      clientId: "k",
      clientSecret: "s",
    });
    const c = loadSsoConfig({ SSO_KAKAO_CLIENT_SECRET: "s" });
    expect(c.providers.kakao).toBeUndefined();
    expect(c.problems).toHaveLength(1);
  });

  it("Apple 개인 키의 \\n 은 실제 줄바꿈이 된다", () => {
    const c = loadSsoConfig({
      SSO_APPLE_CLIENT_ID: "a",
      SSO_APPLE_TEAM_ID: "t",
      SSO_APPLE_KEY_ID: "k",
      SSO_APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----",
    });
    expect(c.providers.apple?.privateKey).toBe("-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----");
  });

  it("공개 주소는 끝의 슬래시를 떼고, 이상한 값은 설정 오류다", () => {
    expect(loadSsoConfig({ SSO_PUBLIC_BASE_URL: "https://api.example.com/" }).publicBaseUrl).toBe("https://api.example.com");
    expect(() => loadSsoConfig({ SSO_PUBLIC_BASE_URL: "ftp://x" })).toThrow();
    expect(() => loadSsoConfig({ SSO_PUBLIC_BASE_URL: "not a url" })).toThrow();
  });

  it("돌아올 주소는 기본값 + 환경 변수의 목록이고, 운영에서는 localhost 를 막는다", () => {
    const dev = loadSsoConfig({ SSO_ALLOWED_REDIRECTS: " https://app.example.com/auth.html , ,x://y " });
    expect(dev.redirects.allowed).toEqual([DEFAULT_APP_REDIRECT, "https://app.example.com/auth.html", "x://y"]);
    expect(dev.redirects.allowLocalhost).toBe(true);
    expect(loadSsoConfig({ NODE_ENV: "production" }).redirects.allowLocalhost).toBe(false);
  });
});
