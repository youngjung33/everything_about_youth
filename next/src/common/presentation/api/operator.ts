import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "./errors";

/** 운영자 요청에 담는 헤더. 값은 서버의 `OPERATOR_TOKEN` 과 같아야 한다. */
export const OPERATOR_TOKEN_HEADER = "x-operator-token";

export const MIN_OPERATOR_TOKEN_LENGTH = 24;

export type OperatorDecision = "allowed" | "disabled" | "forbidden";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** 길이와 무관하게 같은 시간에 비교한다. (해시를 만들어 길이를 맞춘 뒤 timingSafeEqual) */
export function tokensMatch(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * 운영자용 요청(수집 트리거 등)을 허용할지 판단한다.
 *  - `OPERATOR_TOKEN` 이 있으면: 요청 헤더의 값이 같을 때만 허용 (개발/운영 모두)
 *  - 없으면: 개발에서는 허용(로컬 편의), 운영에서는 기능 자체를 끈다
 * 운영에서 토큰이 너무 짧으면 짐작으로 뚫릴 수 있으므로 끈다.
 */
export function authorizeOperator(
  givenToken: string | null,
  env: Record<string, string | undefined> = process.env,
): OperatorDecision {
  const expected = env.OPERATOR_TOKEN?.trim();
  const production = env.NODE_ENV === "production";

  if (!expected) return production ? "disabled" : "allowed";
  if (production && expected.length < MIN_OPERATOR_TOKEN_LENGTH) return "disabled";
  if (!givenToken) return "forbidden";
  return tokensMatch(givenToken.trim(), expected) ? "allowed" : "forbidden";
}

/** 운영자가 아니면 `ApiError` 를 던진다. 이유는 응답에 자세히 알리지 않는다. */
export function assertOperator(request: Request, env: Record<string, string | undefined> = process.env): void {
  const decision = authorizeOperator(request.headers.get(OPERATOR_TOKEN_HEADER), env);
  if (decision === "disabled") throw new ApiError("OPERATOR_DISABLED");
  if (decision === "forbidden") throw new ApiError("FORBIDDEN");
}
