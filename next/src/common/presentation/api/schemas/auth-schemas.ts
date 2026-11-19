import { z } from "zod";
import { SSO_PROVIDER_IDS } from "@/common/application/sso";

/** 토큰 재발급 요청 본문. */
export const refreshBodySchema = z.object({
  refreshToken: z.string().trim().min(1),
});

/** SSO 시작 요청 본문. */
export const ssoStartBodySchema = z.object({
  provider: z.enum(SSO_PROVIDER_IDS),
  redirectUri: z.string().trim().url(),
  codeChallenge: z.string().trim().min(43).max(128),
});

/** SSO 티켓 교환 요청 본문. */
export const ssoExchangeBodySchema = z.object({
  ticket: z.string().trim().min(1),
  verifier: z.string().trim().min(43).max(128),
});


