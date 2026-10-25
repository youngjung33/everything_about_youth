import { ERROR_CODES, type ErrorCode } from "./errors";

/** 서버가 앱에 내려줄 수 있는 오류 코드 목록. `contracts/api/error-codes.json` 과 동기화한다. */
export interface ServerErrorCodeEntry {
  code: ErrorCode;
  status: number;
  message: string;
}

export function listServerErrorCodes(): ServerErrorCodeEntry[] {
  return (Object.keys(ERROR_CODES) as ErrorCode[]).map((code) => ({
    code,
    status: ERROR_CODES[code].status,
    message: ERROR_CODES[code].message,
  }));
}

/** 앱만 쓰는 코드(네트워크·해석 실패). 서버 JSON 응답에는 나오지 않는다. */
export const CLIENT_ONLY_ERROR_CODES = [
  "NETWORK_ERROR",
  "TIMEOUT",
  "BAD_RESPONSE",
  "UNKNOWN",
] as const;

export type ClientOnlyErrorCode = (typeof CLIENT_ONLY_ERROR_CODES)[number];
