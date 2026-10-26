import { AuthService } from "@/common/application/auth";
import { SsoService } from "@/common/application/sso-service";
import { getCommonContainer } from "../container";
import { loadAuthConfig } from "../config/auth-config";
import { loadGuestSessionConfig } from "../config/guest-session-config";
import { loadSsoConfig, type SsoConfig } from "../config/sso-config";
import { createAuthClientStore, createSsoTicketStore, createUserStore } from "../persistence/create-stores";
import type { SqliteAuthClientStore } from "../persistence/sqlite/sqlite-auth-client-store";
import { JoseSsoStateCodec } from "./sso/jose-sso-state-codec";
import { createSsoProviders } from "./sso/providers";
import { createTokenService } from "./token-service-factory";

const authKey = Symbol.for("everything_about_youth.auth-service");
const clientsKey = Symbol.for("everything_about_youth.auth-clients");
const ssoKey = Symbol.for("everything_about_youth.sso-service");
type GlobalWithAuth = typeof globalThis & {
  [authKey]?: AuthService;
  [clientsKey]?: SqliteAuthClientStore;
  [ssoKey]?: { service: SsoService; config: SsoConfig };
};

/** 세션(기기) 기록. 라우트가 "이 세션이 어느 회원인가"를 물어볼 때 쓴다. */
export function getAuthClientStore(): SqliteAuthClientStore {
  const g = globalThis as GlobalWithAuth;
  if (!g[clientsKey]) g[clientsKey] = createAuthClientStore(getCommonContainer().persistence) as SqliteAuthClientStore;
  return g[clientsKey];
}

/** 세션 발급/갱신용. 세션 식별자를 DB 에 저장하므로 공용 컨테이너의 연결을 쓴다. (proxy 에서는 import 금지) */
export function getAuthService(): AuthService {
  const g = globalThis as GlobalWithAuth;
  if (!g[authKey]) {
    const common = getCommonContainer();
    const guest = loadGuestSessionConfig();
    g[authKey] = new AuthService(
      createTokenService(),
      getAuthClientStore(),
      common.clock,
      () => crypto.randomUUID(),
      guest,
    );
  }
  return g[authKey]!;
}

/** SSO 로그인용. 설정(키)이 있는 로그인 업체만 켜진다. */
export function getSso(): { service: SsoService; config: SsoConfig } {
  const g = globalThis as GlobalWithAuth;
  if (!g[ssoKey]) {
    const common = getCommonContainer();
    const config = loadSsoConfig();
    for (const problem of config.problems) common.logger.warn(`[sso] ${problem}`);

    const auth = loadAuthConfig();
    const providers = createSsoProviders(config.providers, { fetch, now: () => common.clock.now() });
    common.logger.info(`[sso] 사용 가능한 로그인: ${Object.keys(providers).join(", ") || "없음 (비회원 조회만 가능)"}`);

    g[ssoKey] = {
      config,
      service: new SsoService({
        providers,
        state: new JoseSsoStateCodec(auth.secret, auth.issuer, common.clock),
        users: createUserStore(common.persistence),
        tickets: createSsoTicketStore(common.persistence),
        clients: getAuthClientStore(),
        auth: getAuthService(),
        clock: common.clock,
        logger: common.logger,
        redirects: config.redirects,
      }),
    };
  }
  return g[ssoKey]!;
}
