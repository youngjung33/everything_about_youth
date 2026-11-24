import { z } from "zod";
import { emptyToUndefined } from "@/common/infrastructure/config/env";
import { WeakPasswordError, hashAdminPassword } from "@/features/admin/domain/password";

const DEV_BOOTSTRAP_PASSWORD = "123456";

const schema = z.object({
  ADMIN_BOOTSTRAP_LOGIN_ID: z.preprocess(emptyToUndefined, z.string().trim().min(2).default("ADMIN")),
  ADMIN_BOOTSTRAP_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(6).optional()),
});

/** 최초 관리자(bootstrap) 계정 env */
export interface AdminBootstrapConfig {
  loginId: string; // loginId
  password: string; // 평문(부트스트랩 insert 직전만 사용)
}

let warnedDevBootstrap = false;

/**
 * DB 에 관리자가 없을 때 만드는 루트 계정 설정.
 * 운영(production)에서는 ADMIN_BOOTSTRAP_PASSWORD 가 없으면 기동·부트스트랩 시 실패한다.
 */
export function loadAdminBootstrapConfig(env: Record<string, string | undefined> = process.env): AdminBootstrapConfig {
  const parsed = schema.parse(env);
  const production = env.NODE_ENV === "production";
  let password = parsed.ADMIN_BOOTSTRAP_PASSWORD;
  if (!password) {
    if (production) {
      throw new Error("운영 환경에서는 ADMIN_BOOTSTRAP_PASSWORD(6자 이상)가 필요합니다.");
    }
    if (!warnedDevBootstrap) {
      warnedDevBootstrap = true;
      console.warn("[admin] ADMIN_BOOTSTRAP_PASSWORD 없음 — 개발용 기본 비밀번호를 씁니다. 운영에서는 반드시 env 로 설정하세요.");
    }
    password = DEV_BOOTSTRAP_PASSWORD;
  }
  try {
    hashAdminPassword(password);
  } catch (e) {
    if (e instanceof WeakPasswordError) throw new Error("ADMIN_BOOTSTRAP_PASSWORD 가 너무 짧습니다.");
    throw e;
  }
  return { loginId: parsed.ADMIN_BOOTSTRAP_LOGIN_ID, password };
}