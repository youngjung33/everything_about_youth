import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter, type RateLimitPolicy } from "./rate-limit";

const policy: RateLimitPolicy = { name: "t", limit: 3, windowMs: 10_000 };

function limiter(maxKeys?: number) {
  let now = 1_000_000;
  const l = new FixedWindowRateLimiter(() => now, maxKeys);
  return { l, advance: (ms: number) => (now += ms) };
}

describe("FixedWindowRateLimiter", () => {
  it("한도까지 허용하고 남은 횟수를 알려 준다", () => {
    const { l } = limiter();
    expect(l.check("a", policy)).toMatchObject({ allowed: true, remaining: 2, limit: 3 });
    expect(l.check("a", policy)).toMatchObject({ allowed: true, remaining: 1 });
    expect(l.check("a", policy)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("한도를 넘으면 거절하고 다시 시도할 초를 알려 준다", () => {
    const { l, advance } = limiter();
    for (let i = 0; i < 3; i++) l.check("a", policy);
    advance(2_500);

    const r = l.check("a", policy);
    expect(r).toMatchObject({ allowed: false, remaining: 0, retryAfterSec: 8 }); // 7.5초 남음 → 올림
  });

  it("거절된 요청은 횟수를 더 늘리지 않는다 (창이 끝나면 정상으로 돌아온다)", () => {
    const { l, advance } = limiter();
    for (let i = 0; i < 10; i++) l.check("a", policy);
    advance(10_000);
    expect(l.check("a", policy)).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("키와 정책 이름이 다르면 따로 센다", () => {
    const { l } = limiter();
    for (let i = 0; i < 3; i++) l.check("a", policy);
    expect(l.check("a", policy).allowed).toBe(false);
    expect(l.check("b", policy).allowed).toBe(true);
    expect(l.check("a", { ...policy, name: "other" }).allowed).toBe(true);
  });

  it("키가 한도를 넘게 늘어도 메모리가 무한히 커지지 않는다", () => {
    const { l } = limiter(100);
    for (let i = 0; i < 1_000; i++) l.check(`k${i}`, policy);
    expect(l.size).toBeLessThanOrEqual(100);
    // 가장 최근 키는 남아 있어 계속 센다
    l.check("k999", policy);
    l.check("k999", policy);
    l.check("k999", policy);
    expect(l.check("k999", policy).allowed).toBe(false);
  });

  it("만료된 키는 정리된다", () => {
    const { l, advance } = limiter(10);
    for (let i = 0; i < 10; i++) l.check(`old${i}`, policy);
    advance(20_000);
    for (let i = 0; i < 5; i++) l.check(`new${i}`, policy);
    expect(l.size).toBeLessThanOrEqual(10);
  });
});
