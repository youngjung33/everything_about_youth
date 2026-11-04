import { XMLParser } from "fast-xml-parser";
import type { Json } from "@/common/infrastructure/http/mapping";

/** 온통 OPEN API 응답(JSON 또는 XML) 파싱 */
export function parseOntongBody(text: string): Json {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as Json;
    } catch {
      /* fall through */
    }
  }
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  return parser.parse(trimmed) as Json;
}
