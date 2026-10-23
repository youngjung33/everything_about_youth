import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { assertOperator, authorizeOperator, OPERATOR_TOKEN_HEADER, tokensMatch } from "./operator";

const TOKEN = "operator-token-for-tests-0123456789";

describe("authorizeOperator", () => {
  it("토큰이 설정돼 있으면 같은 값만 허용한다", () => {
    const env = { OPERATOR_TOKEN: TOKEN, NODE_ENV: "production" };
    expect(authorizeOperator(TOKEN, env)).toBe("allowed");
    expect(authorizeOperator(`  ${TOKEN}  `, env)).toBe("allowed");
    expect(authorizeOperator("wrong-token-wrong-token-xxxx", env)).toBe("forbidden");
    expect(authorizeOperator(TOKEN.slice(0, -1), env)).toBe("forbidden");
    expect(authorizeOperator(null, env)).toBe("forbidden");
    expect(authorizeOperator("", env)).toBe("forbidden");
  });

  it("개발에서는 토큰이 없어도 허용하지만, 설정돼 있으면 개발에서도 검사한다", () => {
    expect(authorizeOperator(null, { NODE_ENV: "development" })).toBe("allowed");
    expect(authorizeOperator(null, {})).toBe("allowed");
    expect(authorizeOperator(null, { NODE_ENV: "development", OPERATOR_TOKEN: TOKEN })).toBe("forbidden");
    expect(authorizeOperator(TOKEN, { NODE_ENV: "development", OPERATOR_TOKEN: TOKEN })).toBe("allowed");
  });

  it("운영에서 토큰이 없거나 너무 짧으면 기능을 끈다", () => {
    expect(authorizeOperator("anything", { NODE_ENV: "production" })).toBe("disabled");
    expect(authorizeOperator(null, { NODE_ENV: "production", OPERATOR_TOKEN: "   " })).toBe("disabled");
    expect(authorizeOperator("short", { NODE_ENV: "production", OPERATOR_TOKEN: "short" })).toBe("disabled");
  });

  it("예전 ALLOW_WEB_SYNC 는 더 이상 효력이 없다", () => {
    expect(authorizeOperator(null, { NODE_ENV: "production", ALLOW_WEB_SYNC: "true" })).toBe("disabled");
  });
});

describe("tokensMatch", () => {
  it("길이가 달라도 예외 없이 비교한다", () => {
    expect(tokensMatch("a", "abcdef")).toBe(false);
    expect(tokensMatch("abcdef", "abcdef")).toBe(true);
  });
});

describe("assertOperator", () => {
  const env = { OPERATOR_TOKEN: TOKEN, NODE_ENV: "production" };
  const req = (token?: string) => new Request("http://x/api", { headers: token ? { [OPERATOR_TOKEN_HEADER]: token } : {} });

  it("올바른 토큰이면 통과한다", () => {
    expect(() => assertOperator(req(TOKEN), env)).not.toThrow();
  });

  it("틀리면 FORBIDDEN, 꺼져 있으면 OPERATOR_DISABLED 를 던진다", () => {
    expect(() => assertOperator(req("nope"), env)).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertOperator(req(), env)).toThrow(ApiError);
    expect(() => assertOperator(req(TOKEN), { NODE_ENV: "production" })).toThrowError(
      expect.objectContaining({ code: "OPERATOR_DISABLED" }),
    );
  });
});
