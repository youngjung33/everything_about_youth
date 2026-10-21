import type { SsoProviders } from "@/common/application/sso";
import type { SsoConfig } from "../../config/sso-config";
import { createAppleProvider } from "./apple";
import { createGoogleProvider } from "./google";
import type { ProviderDeps } from "./http";
import { createKakaoProvider } from "./kakao";
import { createNaverProvider } from "./naver";

/** 설정(키)이 있는 업체만 만든다. 없는 업체는 목록에 없고, 로그인 화면에서 "준비 중"이 된다. */
export function createSsoProviders(config: SsoConfig["providers"], deps: ProviderDeps): SsoProviders {
  return {
    ...(config.google ? { google: createGoogleProvider(config.google, deps) } : {}),
    ...(config.apple ? { apple: createAppleProvider(config.apple, deps) } : {}),
    ...(config.naver ? { naver: createNaverProvider(config.naver, deps) } : {}),
    ...(config.kakao ? { kakao: createKakaoProvider(config.kakao, deps) } : {}),
  };
}
