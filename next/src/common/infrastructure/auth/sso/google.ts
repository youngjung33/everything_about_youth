import type { SsoProvider } from "@/common/application/sso";
import { form, readIdToken, requestJson, requireString, type ProviderDeps } from "./http";

/** Google (OpenID Connect). 받는 정보는 고유 번호(sub)뿐이다. */
export function createGoogleProvider(config: { clientId: string; clientSecret: string }, deps: ProviderDeps): SsoProvider {
  return {
    id: "google",

    authorizationUrl({ state, nonce, redirectUri }) {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid", // 이메일·프로필은 요청하지 않는다
        state,
        nonce,
        prompt: "select_account",
      }).toString();
      return url.toString();
    },

    async fetchProfile({ code, nonce, redirectUri }) {
      const token = await requestJson(
        deps.fetch,
        "https://oauth2.googleapis.com/token",
        form({
          grant_type: "authorization_code",
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
        }),
      );
      const subject = readIdToken(token.id_token, {
        issuers: ["https://accounts.google.com", "accounts.google.com"],
        audience: config.clientId,
        nonce,
        now: deps.now(),
      });
      return { subject: requireString(subject, "sub") };
    },
  };
}
