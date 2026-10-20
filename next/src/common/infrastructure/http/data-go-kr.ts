import { XMLParser } from "fast-xml-parser";
import { findDeep, isRecord, str } from "./mapping";

/**
 * 공공데이터포털 서비스키 정규화.
 * 포털은 "인코딩 키(%2B 등 포함)"와 "디코딩 키" 두 가지를 주는데, URLSearchParams 로 한 번만 인코딩되도록 디코딩 형태로 통일한다.
 */
export function normalizeServiceKey(key: string): string {
  const trimmed = key.trim();
  if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export class DataGoKrError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "DataGoKrError";
  }
}

const xmlParser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

/** JSON 또는 XML 응답 본문을 객체로 파싱하고, 게이트웨이/서비스 오류를 예외로 변환한다. */
export function parseDataGoKrBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new DataGoKrError("빈 응답");

  let parsed: unknown;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new DataGoKrError(`JSON 파싱 실패: ${trimmed.slice(0, 120)}`);
    }
  } else if (trimmed.startsWith("<")) {
    parsed = xmlParser.parse(trimmed);
  } else {
    // 게이트웨이가 평문 에러를 주는 경우 (예: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR")
    throw new DataGoKrError(trimmed.slice(0, 200));
  }

  assertNoError(parsed);
  return parsed;
}

function assertNoError(parsed: unknown): void {
  // 게이트웨이 오류 (XML): <OpenAPI_ServiceResponse><cmmMsgHeader>...
  const gateway = findDeep(parsed, "cmmMsgHeader");
  if (isRecord(gateway)) {
    throw new DataGoKrError(
      `${str(gateway, "errMsg") ?? "API 오류"}: ${str(gateway, "returnAuthMsg") ?? ""} (${str(gateway, "returnReasonCode") ?? "?"})`,
      str(gateway, "returnReasonCode") ?? undefined,
    );
  }

  // 일반 오류: resultCode != 00 (JSON/XML 공통)
  const code = findDeep(parsed, "resultCode");
  const msg = findDeep(parsed, "resultMsg");
  if (typeof code === "string" || typeof code === "number") {
    const c = String(code).trim();
    if (c !== "" && !["00", "000", "0", "INFO-000"].includes(c)) {
      // 데이터 없음(03/ NODATA)은 오류가 아니라 빈 결과로 취급
      if (!["03", "NODATA_ERROR"].includes(c)) {
        throw new DataGoKrError(`${typeof msg === "string" ? msg : "API 오류"} (code ${c})`, c);
      }
    }
  }

  // odcloud 형식 오류: { code: -4, msg: "등록되지 않은 인증키 입니다." }
  if (isRecord(parsed) && typeof parsed.code === "number" && parsed.code < 0) {
    throw new DataGoKrError(String(parsed.msg ?? "API 오류"), String(parsed.code));
  }
}

/** URL + 쿼리 조립 (서비스키 한 번만 인코딩) */
export function buildUrl(base: string, params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  return `${base}?${qs.toString()}`;
}
