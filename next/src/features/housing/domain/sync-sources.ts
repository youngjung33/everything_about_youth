import { SOURCE_IDS, type SourceId } from "./enums";

/** 쿼리·환경 변수의 소스 목록 문자열을 [SourceId] 로 파싱한다. */
export function parseSourceList(value: string | undefined): SourceId[] {
  if (!value) return [];
  const names = value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const unknown = names.filter((n) => !(SOURCE_IDS as readonly string[]).includes(n));
  if (unknown.length > 0) {
    throw new Error(`알 수 없는 소스: ${unknown.join(", ")} (사용 가능: ${SOURCE_IDS.join(", ")})`);
  }
  return names as SourceId[];
}
