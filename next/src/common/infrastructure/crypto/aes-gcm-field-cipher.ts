import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { FieldCipherError, type FieldCipher } from "@/common/application/field-cipher";

const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * AES-256-GCM 으로 암호화한다. (암호화와 변조 검사를 함께 하는 방식)
 *
 * 암호문 형식: `v1.<base64url(iv 12바이트 | 암호문 | 인증 태그 16바이트)>`
 * - 암호화할 때마다 새 무작위 iv 를 쓰므로 같은 값도 매번 다른 암호문이 된다.
 * - 앞의 `v1` 은 형식 버전이다. 알고리즘을 바꿀 때 구분하려는 것이다.
 *
 * 키 교체: 첫 번째 키로만 암호화하고, 복호화는 모든 키를 순서대로 시도한다.
 * 새 키를 맨 앞에 두고 옛 키를 뒤에 남기면, 옛 암호문도 읽히고 다시 저장할 때 새 키로 바뀐다.
 */
export class AesGcmFieldCipher implements FieldCipher {
  private readonly keys: Buffer[];

  constructor(keys: Buffer[]) {
    if (keys.length === 0) throw new Error("암호화 키가 필요합니다.");
    for (const key of keys) {
      if (key.length !== KEY_BYTES) throw new Error(`암호화 키는 ${KEY_BYTES}바이트여야 합니다.`);
    }
    this.keys = keys;
  }

  encrypt(plain: string, context: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.keys[0]!, iv);
    cipher.setAAD(Buffer.from(context, "utf8"));
    const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return `${VERSION}.${Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url")}`;
  }

  decrypt(token: string, context: string): string {
    const prefix = `${VERSION}.`;
    if (!token.startsWith(prefix)) throw new FieldCipherError("지원하지 않는 암호문 형식입니다.");

    const bytes = Buffer.from(token.slice(prefix.length), "base64url");
    if (bytes.length < IV_BYTES + TAG_BYTES) throw new FieldCipherError("암호문이 손상되었습니다.");

    const iv = bytes.subarray(0, IV_BYTES);
    const tag = bytes.subarray(bytes.length - TAG_BYTES);
    const body = bytes.subarray(IV_BYTES, bytes.length - TAG_BYTES);

    for (const key of this.keys) {
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAAD(Buffer.from(context, "utf8"));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
      } catch {
        // 이 키로는 안 풀린다. 다음 키(옛 키)를 시도한다.
      }
    }
    throw new FieldCipherError("복호화하지 못했습니다. (키가 다르거나 값이 변조되었습니다)");
  }
}

/** base64 로 적힌 32바이트 키를 읽는다. */
export function parseCipherKey(base64: string, name = "암호화 키"): Buffer {
  const key = Buffer.from(base64.trim(), "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`${name} 는 base64 로 인코딩한 ${KEY_BYTES}바이트여야 합니다. (현재 ${key.length}바이트)`);
  }
  return key;
}

/**
 * 환경 변수에서 암호기를 만든다.
 * - DATA_ENCRYPTION_KEY            현재 키 (필수)
 * - DATA_ENCRYPTION_KEY_PREVIOUS   옛 키들 (쉼표로 구분, 선택. 키를 교체한 뒤 옛 데이터를 읽기 위해 남긴다)
 *
 * 키 만들기: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 * 키를 잃으면 암호화한 데이터는 복구할 수 없으니 비밀 저장소에 따로 보관하세요. 코드 저장소에 넣으면 안 됩니다.
 */
export function createFieldCipherFromEnv(env: Record<string, string | undefined> = process.env): AesGcmFieldCipher {
  const current = env.DATA_ENCRYPTION_KEY?.trim();
  if (!current) {
    throw new Error("DATA_ENCRYPTION_KEY 가 설정되어 있지 않습니다. (next/README.md 의 '개인정보 암호화' 참고)");
  }
  const previous = (env.DATA_ENCRYPTION_KEY_PREVIOUS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => parseCipherKey(k, "DATA_ENCRYPTION_KEY_PREVIOUS"));

  return new AesGcmFieldCipher([parseCipherKey(current, "DATA_ENCRYPTION_KEY"), ...previous]);
}
