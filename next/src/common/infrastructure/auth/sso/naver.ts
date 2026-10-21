import type { SsoProvider } from "@/common/application/sso";
import { bearer, requestJson, requireString, type ProviderDeps } from "./http";

/** 네이버 로그인. 받는 정보는 고유 번호(id)뿐이다. */
export function createNaverProvider(config: { clientId: string; clientSecret: string }, deps: ProviderDeps): SsoProvider {
  return {
    id: "naver",

    authorizationUrl({ state, redirectUri }) {
      const url = new URL("https://nid.naver.com/oauth2.0/authorize");
      url.search = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: redirectUri,
        state,
      }).toString();
      return url.toString();
    },

    async fetchProfile({ code, state }) {
      // 네이버는 토큰 요청에도 state 를 요구하고, 오류를 HTTP 200 + error 필드로 돌려준다. (requestJson 이 걸러낸다)
      const tokenUrl = new URL("https://nid.naver.com/oauth2.0/token");
      tokenUrl.search = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        state,
      }).toString();
      const token = await requestJson(deps.fetch, tokenUrl.toString());

      const me = await requestJson(
        deps.fetch,
        "https://openapi.naver.com/v1/nid/me",
        bearer(requireString(token.access_token, "access_token")),
      );
      const profile = typeof me.response === "object" && me.response !== null ? (me.response as Record<string, unknown>) : {};
      return { subject: requireString(profile.id, "id") };
    },
  };
}
