import { AuthService } from "@/common/application/auth";
import { getCommonContainer } from "../container";
import { SqliteAuthClientStore } from "../persistence/sqlite/sqlite-auth-client-store";
import { createTokenService } from "./token-service-factory";

const globalKey = Symbol.for("everything_about_youth.auth-service");
type GlobalWithAuth = typeof globalThis & { [globalKey]?: AuthService };

/** 세션 발급/갱신용. 기기 식별자를 DB 에 저장하므로 공용 컨테이너의 연결을 쓴다. (proxy 에서는 import 금지) */
export function getAuthService(): AuthService {
  const g = globalThis as GlobalWithAuth;
  if (!g[globalKey]) {
    const common = getCommonContainer();
    g[globalKey] = new AuthService(
      createTokenService(),
      new SqliteAuthClientStore(common.sqlite.db),
      common.clock,
      () => crypto.randomUUID(),
    );
  }
  return g[globalKey]!;
}
