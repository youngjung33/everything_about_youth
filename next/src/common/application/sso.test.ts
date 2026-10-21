import { describe, expect, it } from "vitest";
import {
  PKCE_CHALLENGE_PATTERN,
  PKCE_VERIFIER_PATTERN,
  isAllowedRedirectUri,
  isSsoProviderId,
  randomToken,
  sha256Base64Url,
  type RedirectRules,
} from "./sso";

const rules: RedirectRules = {
  allowed: ["everythingaboutyouth://auth", "https://app.example.com/auth.html"],
  allowLocalhost: true,
};

describe("isAllowedRedirectUri", () => {
  it("허용 목록에 정확히 있는 주소만 통과한다", () => {
    expect(isAllowedRedirectUri("everythingaboutyouth://auth", rules)).toBe(true);
    expect(isAllowedRedirectUri("https://app.example.com/auth.html", rules)).toBe(true);
  });

  it("목록에 없는 주소는 거절한다 (open redirect 방지)", () => {
    for (const uri of [
      "https://evil.com/auth.html",
      "https://app.example.com.evil.com/auth.html",
      "https://app.example.com/other",
      "http://app.example.com/auth.html", // 스킴이 다르다
      "everythingaboutyouth://other",
      "otherapp://auth",
      "javascript:alert(1)",
      "//evil.com",
      "not a url",
      "",
    ]) {
      expect(isAllowedRedirectUri(uri, rules), uri).toBe(false);
    }
  });

  it("쿼리, 해시, 사용자 정보가 붙은 주소는 거절한다 (우리가 ?ticket= 을 붙이므로)", () => {
    for (const uri of [
      "everythingaboutyouth://auth?x=1",
      "everythingaboutyouth://auth#frag",
      "everythingaboutyouth://auth?",
      "https://user:pw@app.example.com/auth.html",
    ]) {
      expect(isAllowedRedirectUri(uri, rules), uri).toBe(false);
    }
  });

  it("개발 중에는 localhost 의 아무 포트나 /auth.html 만 허용하고, 운영에서는 막는다", () => {
    expect(isAllowedRedirectUri("http://localhost:5173/auth.html", rules)).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:8080/auth.html", rules)).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:5173/other.html", rules)).toBe(false);
    expect(isAllowedRedirectUri("https://localhost:5173/auth.html", rules)).toBe(false);
    expect(isAllowedRedirectUri("http://localhost.evil.com/auth.html", rules)).toBe(false);

    const production = { ...rules, allowLocalhost: false };
    expect(isAllowedRedirectUri("http://localhost:5173/auth.html", production)).toBe(false);
  });
});

describe("PKCE", () => {
  it("RFC 7636 의 예시 값으로 challenge 를 만든다", async () => {
    // RFC 7636 부록 B
    expect(await sha256Base64Url("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("challenge 는 43자 base64url, verifier 는 43~128자", async () => {
    expect(PKCE_CHALLENGE_PATTERN.test(await sha256Base64Url("x"))).toBe(true);
    expect(PKCE_CHALLENGE_PATTERN.test("short")).toBe(false);
    expect(PKCE_CHALLENGE_PATTERN.test("a".repeat(44))).toBe(false);
    expect(PKCE_VERIFIER_PATTERN.test("a".repeat(43))).toBe(true);
    expect(PKCE_VERIFIER_PATTERN.test("a".repeat(42))).toBe(false);
    expect(PKCE_VERIFIER_PATTERN.test("a".repeat(129))).toBe(false);
    expect(PKCE_VERIFIER_PATTERN.test(`${"a".repeat(43)}!`)).toBe(false);
  });

  it("randomToken 은 매번 다르고 verifier 규칙을 만족한다", () => {
    const tokens = new Set(Array.from({ length: 50 }, randomToken));
    expect(tokens.size).toBe(50);
    for (const t of tokens) expect(PKCE_VERIFIER_PATTERN.test(t)).toBe(true);
  });
});

describe("isSsoProviderId", () => {
  it("네 곳만 인정한다", () => {
    for (const id of ["google", "apple", "naver", "kakao"]) expect(isSsoProviderId(id)).toBe(true);
    for (const id of ["facebook", "", "GOOGLE", null, undefined, 1]) expect(isSsoProviderId(id)).toBe(false);
  });
});
