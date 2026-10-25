import { z } from "zod";
import { SSO_PROVIDER_IDS } from "@/common/application/sso";

export const refreshBodySchema = z.object({
  refreshToken: z.string().trim().min(1),
});

export const ssoStartBodySchema = z.object({
  provider: z.enum(SSO_PROVIDER_IDS),
  redirectUri: z.string().trim().url(),
  codeChallenge: z.string().trim().min(43).max(128),
});

export const ssoExchangeBodySchema = z.object({
  ticket: z.string().trim().min(1),
  verifier: z.string().trim().min(43).max(128),
});
