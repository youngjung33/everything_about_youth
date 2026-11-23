import { describe, expect, it } from "vitest";
import { hashAdminPassword, verifyAdminPassword, WeakPasswordError } from "@/features/admin/domain/password";

describe("hashAdminPassword", () => {
  it("짧은 비밀번호는 거절한다", () => {
    expect(() => hashAdminPassword("12345")).toThrow(WeakPasswordError);
  });

  it("해시와 검증이 맞는다", () => {
    const enc = hashAdminPassword("123456");
    expect(verifyAdminPassword("123456", enc)).toBe(true);
    expect(verifyAdminPassword("wrong", enc)).toBe(false);
  });
});