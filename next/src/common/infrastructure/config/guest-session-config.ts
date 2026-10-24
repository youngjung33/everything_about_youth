import { z } from "zod";
import { emptyToUndefined } from "./env";

const schema = z.object({
  AUTH_GUEST_SESSION_MAX_AGE_DAYS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(90)),
  AUTH_GUEST_SESSION_MAX_ROWS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(100).default(10_000)),
});

export interface GuestSessionConfig {
  /** 이 기간보다 오래 접속하지 않은 비회원 세션 행을 지운다. */
  maxAgeDays: number;
  /** 비회원 세션 행이 이 수를 넘으면 가장 오래 안 쓴 것부터 지운다. 회원 세션은 건드리지 않는다. */
  maxRows: number;
}

export function loadGuestSessionConfig(env: Record<string, string | undefined> = process.env): GuestSessionConfig {
  const parsed = schema.parse(env);
  return { maxAgeDays: parsed.AUTH_GUEST_SESSION_MAX_AGE_DAYS, maxRows: parsed.AUTH_GUEST_SESSION_MAX_ROWS };
}
