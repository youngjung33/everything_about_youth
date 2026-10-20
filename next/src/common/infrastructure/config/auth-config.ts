import { z } from "zod";
import { emptyToUndefined } from "./env";

const schema = z.object({
  JWT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_ISSUER: z.preprocess(emptyToUndefined, z.string().default("everything-about-youth")),
  JWT_AUDIENCE: z.preprocess(emptyToUndefined, z.string().default("everything-about-youth-app")),
  JWT_ACCESS_TTL_SEC: z.preprocess(emptyToUndefined, z.coerce.number().int().min(30).default(15 * 60)),
  JWT_REFRESH_TTL_SEC: z.preprocess(emptyToUndefined, z.coerce.number().int().min(60).default(30 * 24 * 60 * 60)),
});

export interface AuthConfig {
  secret: string;
  issuer: string;
  audience: string;
  accessTtlSec: number;
  refreshTtlSec: number;
}

export const MIN_SECRET_LENGTH = 32;

/** 개발에서 JWT_SECRET 이 없을 때만 쓰는 값. 운영에서는 절대 쓰이지 않는다(없으면 시작을 거부한다). */
const DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

let warnedDevSecret = false;

/**
 * 인증 설정. DB/수집 설정과 분리해서 인증을 쓰는 곳(API, proxy)만 읽는다.
 * 운영(production)에서는 32자 이상의 JWT_SECRET 이 없으면 시작하지 않는다. (약한 키로 토큰이 발급되는 것을 막기 위해)
 */
export function loadAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  const parsed = schema.parse(env);
  const production = env.NODE_ENV === "production";

  let secret = parsed.JWT_SECRET;
  if (secret === undefined) {
    if (production) throw new Error(`JWT_SECRET 이 필요합니다. (${MIN_SECRET_LENGTH}자 이상, 예: openssl rand -base64 48)`);
    if (!warnedDevSecret) {
      warnedDevSecret = true;
      console.warn("[auth] JWT_SECRET 이 없어 개발용 임시 키를 사용합니다. 운영에서는 반드시 설정하세요.");
    }
    secret = DEV_SECRET;
  } else if (production && secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET 은 ${MIN_SECRET_LENGTH}자 이상이어야 합니다.`);
  }

  return {
    secret,
    issuer: parsed.JWT_ISSUER,
    audience: parsed.JWT_AUDIENCE,
    accessTtlSec: parsed.JWT_ACCESS_TTL_SEC,
    refreshTtlSec: parsed.JWT_REFRESH_TTL_SEC,
  };
}
