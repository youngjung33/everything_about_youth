import type { SsoProvider } from "@/common/application/sso";
import { bearer, form, requestJson, requireString, type ProviderDeps } from "./http";

/** 카카오 로그인. 받는 정보는 회원 번호(id)뿐이다. */
export function createKakaoProvider(
  config: { clientId: string; clientSecret: string | null },
  deps: ProviderDeps,
): SsoProvider {
  return {
    id: "kakao",

    authorizationUrl({ state, redirectUri }) {
      const url = new URL("https://kauth.kakao.com/oauth/authorize");
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
      }).toString();
      return url.toString();
    },

    async fetchProfile({ code, redirectUri }) {
      const token = await requestJson(
        deps.fetch,
        "https://kauth.kakao.com/oauth/token",
        form({
          grant_type: "authorization_code",
          client_id: config.clientId,
          redirect_uri: redirectUri,
          code,
          ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
        }),
      );
      const user = await requestJson(
        deps.fetch,
        "https://kapi.kakao.com/v2/user/me",
        bearer(requireString(token.access_token, "access_token")),
      );
      // 카카오 회원 번호는 숫자다. 문자열로 통일해서 저장한다.
      if (typeof user.id !== "number" && typeof user.id !== "string") throw new Error("로그인 업체의 응답에 id 가 없습니다.");
      return { subject: String(user.id) };
    },
  };
}
