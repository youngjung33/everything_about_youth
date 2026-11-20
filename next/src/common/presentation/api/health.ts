import { getRuntimeEnv } from "@/common/infrastructure/config/runtime-env-config";
import { getCommonContainer, sqliteOf } from "@/common/infrastructure/container";
import type { ApiResult } from "./respond";

/** GET /health 응답. */
export interface HealthDto {
  /** 프로세스는 살아 있다 */
  status: "ok"; // 프로세스는 살아 있다
  /** DB 등 준비가 끝났으면 true. false 이면 로드밸런서가 트래픽을 빼야 한다 */
  ready: boolean; // DB 등 준비가 끝났으면 true. false 이면 로드밸런서가 트래픽을 빼야 한다
  appEnv: string; // appEnv
  checks: {
    database: "ok" | "fail"; // database
  };
}

function checkDatabase(): "ok" | "fail" {
  try {
    sqliteOf(getCommonContainer()).raw.prepare("SELECT 1").get(); // sqliteOf
    return "ok";
  } catch {
    return "fail";
  }
}

/** GET /api/v1/health — 인증 없이 부를 수 있다. */
export function handleHealth(): ApiResult<HealthDto> {
  const database = checkDatabase();
  const ready = database === "ok";
  return {
    status: ready ? 200 : 503,
    body: {
      status: "ok",
      ready,
      appEnv: getRuntimeEnv().appEnv,
      checks: { database },
    },
  };
}

