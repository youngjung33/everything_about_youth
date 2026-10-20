import { systemClock } from "@/common/application/system";
import { loadAuthConfig } from "../config/auth-config";
import { JoseTokenService } from "./jwt-token-service";

/**
 * 설정만으로 토큰 서비스를 만든다. DB 를 열지 않으므로 proxy 가 가볍게 쓸 수 있다.
 * (proxy 는 better-sqlite3 같은 네이티브 모듈을 import 하면 안 된다.)
 */
export function createTokenService(env: Record<string, string | undefined> = process.env) {
  return new JoseTokenService(loadAuthConfig(env), systemClock);
}
