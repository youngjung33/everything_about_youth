import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FieldCipherError } from "@/common/application/field-cipher";
import { AesGcmFieldCipher, createFieldCipherFromEnv, parseCipherKey } from "./aes-gcm-field-cipher";

const key = () => randomBytes(32);

describe("AesGcmFieldCipher", () => {
  it("암호화하고 복호화하면 원래 값이다 (한글/빈 문자열 포함)", () => {
    const cipher = new AesGcmFieldCipher([key()]);
    for (const plain of ["", "abc", '{"age":29,"income":80}', "청년의 모든 것 🏠"]) {
      expect(cipher.decrypt(cipher.encrypt(plain, "ctx"), "ctx")).toBe(plain);
    }
  });

  it("암호문에 원문이 드러나지 않고, 같은 값도 매번 다른 암호문이다", () => {
    const cipher = new AesGcmFieldCipher([key()]);
    const a = cipher.encrypt("secret-income-80", "ctx");
    const b = cipher.encrypt("secret-income-80", "ctx");

    expect(a).toMatch(/^v1\./);
    expect(a).not.toContain("secret");
    expect(a).not.toBe(b);
  });

  it("변조하면 복호화하지 못한다", () => {
    const cipher = new AesGcmFieldCipher([key()]);
    const token = cipher.encrypt("hello", "ctx");
    const bytes = Buffer.from(token.slice(3), "base64url");
    bytes[14] = bytes[14]! ^ 0xff; // 암호문 한 바이트를 뒤집는다
    const tampered = `v1.${bytes.toString("base64url")}`;

    expect(() => cipher.decrypt(tampered, "ctx")).toThrow(FieldCipherError);
  });

  it("다른 키나 다른 context 로는 복호화하지 못한다 (다른 사용자/컬럼의 암호문 바꿔치기 방지)", () => {
    const cipher = new AesGcmFieldCipher([key()]);
    const token = cipher.encrypt("hello", "housing.profile:user-1");

    expect(() => cipher.decrypt(token, "housing.profile:user-2")).toThrow(FieldCipherError);
    expect(() => new AesGcmFieldCipher([key()]).decrypt(token, "housing.profile:user-1")).toThrow(FieldCipherError);
  });

  it("형식이 아니거나 짧은 값은 FieldCipherError", () => {
    const cipher = new AesGcmFieldCipher([key()]);
    for (const bad of ["", "plain", "v2.abc", "v1.", "v1.AAAA"]) {
      expect(() => cipher.decrypt(bad, "ctx"), bad).toThrow(FieldCipherError);
    }
  });

  it("키 교체: 새 키가 맨 앞이면 옛 암호문도 읽히고, 새로 쓰는 것은 새 키로만 읽힌다", () => {
    const oldKey = key();
    const newKey = key();
    const oldToken = new AesGcmFieldCipher([oldKey]).encrypt("old data", "ctx");

    const rotated = new AesGcmFieldCipher([newKey, oldKey]);
    expect(rotated.decrypt(oldToken, "ctx")).toBe("old data");

    const newToken = rotated.encrypt("new data", "ctx");
    expect(new AesGcmFieldCipher([newKey]).decrypt(newToken, "ctx")).toBe("new data");
    expect(() => new AesGcmFieldCipher([oldKey]).decrypt(newToken, "ctx")).toThrow(FieldCipherError);
  });

  it("키는 32바이트여야 한다", () => {
    expect(() => new AesGcmFieldCipher([])).toThrow();
    expect(() => new AesGcmFieldCipher([randomBytes(16)])).toThrow(/32/);
  });
});

describe("환경 변수에서 만들기", () => {
  const b64 = () => randomBytes(32).toString("base64");

  it("DATA_ENCRYPTION_KEY 가 없으면 이유를 알려 준다", () => {
    expect(() => createFieldCipherFromEnv({})).toThrow(/DATA_ENCRYPTION_KEY/);
    expect(() => createFieldCipherFromEnv({ DATA_ENCRYPTION_KEY: "  " })).toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it("잘못된 길이의 키는 거절한다", () => {
    expect(() => createFieldCipherFromEnv({ DATA_ENCRYPTION_KEY: randomBytes(8).toString("base64") })).toThrow(/32바이트/);
    expect(() => parseCipherKey("not-base64!!")).toThrow();
  });

  it("옛 키(쉼표로 여러 개)를 남기면 옛 암호문을 읽는다", () => {
    const oldKey = b64();
    const token = createFieldCipherFromEnv({ DATA_ENCRYPTION_KEY: oldKey }).encrypt("x", "c");

    const rotated = createFieldCipherFromEnv({
      DATA_ENCRYPTION_KEY: b64(),
      DATA_ENCRYPTION_KEY_PREVIOUS: ` ${b64()} , ${oldKey} `,
    });
    expect(rotated.decrypt(token, "c")).toBe("x");
  });
});
