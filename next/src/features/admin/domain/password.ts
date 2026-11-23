import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const MIN_PASSWORD_LENGTH = 6;
const KEY_LEN = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/** 암호 정책 위반 */
export class WeakPasswordError extends Error {
  constructor() {
    super("weak_password");
    this.name = "WeakPasswordError";
  }
}

/** 저장 형식: scrypt$N$r$p$saltB64$hashB64 */
export function hashAdminPassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH) throw new WeakPasswordError();
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** 저장된 해시와 평문이 맞는지 */
export function verifyAdminPassword(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (!Number.isFinite(N) || expected.length !== KEY_LEN) return false;
  const actual = scryptSync(password, salt, KEY_LEN, { N, r, p });
  return timingSafeEqual(actual, expected);
}