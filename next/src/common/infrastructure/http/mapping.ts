export type Json = Record<string, unknown>;

export function isRecord(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 후보 키 중 처음으로 값이 있는 문자열. 빈 객체({} — XML→JSON 변환 시 빈 태그)·빈 문자열은 무시한다. */
export function str(obj: Json, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    } else if (typeof v === "number" || typeof v === "boolean") {
      return String(v);
    }
  }
  return null;
}

/** "47,550", "84.95㎡", "26.5~36.2" 등에서 첫 숫자를 추출한다. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const m = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function num(obj: Json, ...keys: string[]): number | null {
  for (const key of keys) {
    const n = toNumber(obj[key]);
    if (n !== null) return n;
  }
  return null;
}

export function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** 객체 트리에서 key 이름을 가진 첫 값을 깊이 우선으로 찾는다. */
export function findDeep(root: unknown, key: string): unknown {
  if (Array.isArray(root)) {
    for (const el of root) {
      const found = findDeep(el, key);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (isRecord(root)) {
    if (key in root) return root[key];
    for (const v of Object.values(root)) {
      const found = findDeep(v, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** key 하위의 레코드 배열을 찾는다 (단일 객체도 배열로 변환). */
export function findRecords(root: unknown, ...keys: string[]): Json[] {
  for (const key of keys) {
    const found = findDeep(root, key);
    if (found === undefined) continue;
    const list = toArray(found).filter(isRecord);
    if (list.length > 0) return list;
  }
  return [];
}

/** 원 단위 금액 (만원 → 원 변환 포함) */
export const manwonToWon = (v: number | null): number | null => (v === null ? null : Math.round(v * 10_000));
