import { z } from "zod";
import { emptyToUndefined } from "./env";

const APP_ENVS = ["dev", "stage", "prod"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const schema = z.object({
  APP_ENV: z.preprocess(emptyToUndefined, z.enum(APP_ENVS).optional()),
  NODE_ENV: z.preprocess(emptyToUndefined, z.string().optional()),
});

export interface RuntimeEnv {
  appEnv: AppEnv;
}

/**
 * 배포 환경 이름. 로그·오류 수집에 태그로 쓴다.
 *
 * - 개발: `APP_ENV` 없으면 `dev`
 * - 운영(`NODE_ENV=production`): `APP_ENV` 필수 (`dev` | `stage` | `prod`)
 */
export function loadRuntimeEnv(env: Record<string, string | undefined> = process.env): RuntimeEnv {
  const parsed = schema.parse(env);
  const production = parsed.NODE_ENV === "production";
  if (production && parsed.APP_ENV === undefined) {
    throw new Error("운영 환경에서는 APP_ENV(dev|stage|prod)가 필요합니다.");
  }
  return { appEnv: parsed.APP_ENV ?? "dev" };
}

let cached: RuntimeEnv | undefined;

/** 서버 프로세스당 한 번 읽는다. 잘못된 설정이면 시작 단계에서 실패한다. */
export function getRuntimeEnv(): RuntimeEnv {
  if (!cached) cached = loadRuntimeEnv();
  return cached;
}
