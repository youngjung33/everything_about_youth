import { SignJWT, importPKCS8 } from "jose";
import type { SsoProvider } from "@/common/application/sso";
import { form, readIdToken, requestJson, type ProviderDeps } from "./http";

const AUDIENCE = "https://appleid.apple.com";

export interface AppleConfig {
  /** Services ID (웹/앱 공용 로그인용 식별자) */
  clientId: string;
  teamId: string;
  keyId: string;
  /** .p8 파일의 내용 (PKCS#8 PEM) */
  privateKey: string;
}

/**
 * Apple 로그인(Sign in with Apple). 다른 업체와 달리 client_secret 이 고정 문자열이 아니라
 * 개발자 키(.p8)로 서명한 JWT 이고, 요청할 때마다 새로 만든다.
 * scope 를 요청하지 않으므로 이메일·이름은 받지 않고, 응답이 쿼리(GET)로 돌아온다.
 */
export function createAppleProvider(config: AppleConfig, deps: ProviderDeps): SsoProvider {
  async function clientSecret(): Promise<string> {
    const key = await importPKCS8(config.privateKey, "ES256");
    const nowSec = Math.floor(deps.now().getTime() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: config.keyId })
      .setIssuer(config.teamId)
      .setSubject(config.clientId)
      .setAudience(AUDIENCE)
      .setIssuedAt(nowSec)
      .setExpirationTime(nowSec + 5 * 60)
      .sign(key);
  }

  return {
    id: "apple",

    authorizationUrl({ state, nonce, redirectUri }) {
      const url = new URL("https://appleid.apple.com/auth/authorize");
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
        nonce,
      }).toString();
      return url.toString();
    },

    async fetchProfile({ code, nonce, redirectUri }) {
      const token = await requestJson(
        deps.fetch,
        "https://appleid.apple.com/auth/token",
        form({
          grant_type: "authorization_code",
          code,
          client_id: config.clientId,
          client_secret: await clientSecret(),
          redirect_uri: redirectUri,
        }),
      );
      return {
        subject: readIdToken(token.id_token, { issuers: [AUDIENCE], audience: config.clientId, nonce, now: deps.now() }),
      };
    },
  };
}
