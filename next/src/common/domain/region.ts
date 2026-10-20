/** 시도 표준명 (단축형) */
export const SIDO_LIST = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;
export type Sido = (typeof SIDO_LIST)[number];

export interface Region {
  sido: Sido;
  /** 시군구 (예: "강남구", "수원시") */
  sigungu: string | null;
}

const SIDO_ALIASES: Array<[Sido, string[]]> = [
  ["서울", ["서울특별시", "서울시", "서울"]],
  ["부산", ["부산광역시", "부산시", "부산"]],
  ["대구", ["대구광역시", "대구시", "대구"]],
  ["인천", ["인천광역시", "인천시", "인천"]],
  ["광주", ["광주광역시", "광주시", "광주"]],
  ["대전", ["대전광역시", "대전시", "대전"]],
  ["울산", ["울산광역시", "울산시", "울산"]],
  ["세종", ["세종특별자치시", "세종시", "세종"]],
  ["경기", ["경기도", "경기"]],
  ["강원", ["강원특별자치도", "강원도", "강원"]],
  ["충북", ["충청북도", "충북"]],
  ["충남", ["충청남도", "충남"]],
  ["전북", ["전북특별자치도", "전라북도", "전북"]],
  ["전남", ["전라남도", "전남"]],
  ["경북", ["경상북도", "경북"]],
  ["경남", ["경상남도", "경남"]],
  ["제주", ["제주특별자치도", "제주도", "제주"]],
];

/** 법정동 시도 코드(앞 2자리) → 시도 */
const SIDO_BY_CODE: Record<string, Sido> = {
  "11": "서울",
  "26": "부산",
  "27": "대구",
  "28": "인천",
  "29": "광주",
  "30": "대전",
  "31": "울산",
  "36": "세종",
  "41": "경기",
  "42": "강원",
  "51": "강원",
  "43": "충북",
  "44": "충남",
  "45": "전북",
  "52": "전북",
  "46": "전남",
  "47": "경북",
  "48": "경남",
  "50": "제주",
};

export function sidoFromCode(code: string | null | undefined): Sido | null {
  if (!code) return null;
  return SIDO_BY_CODE[code.trim().slice(0, 2)] ?? null;
}

/** "서울특별시", "경기도 수원시", "충청남도" 등에서 시도를 추출한다. */
export function parseSido(text: string | null | undefined): Sido | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const head = t.split(/\s+/)[0] ?? "";
  for (const [sido, aliases] of SIDO_ALIASES) {
    if (aliases.includes(head)) return sido;
  }
  // 주소 중간에 포함된 경우(앞 단어가 아닐 때)를 위한 보조 매칭: 긴 이름 우선
  for (const [sido, aliases] of SIDO_ALIASES) {
    for (const alias of [...aliases].sort((a, b) => b.length - a.length)) {
      if (alias.length >= 3 && t.includes(alias)) return sido;
    }
  }
  return null;
}

/** 주소 전체 문자열에서 시도/시군구를 추출한다. */
export function parseRegionFromAddress(address: string | null | undefined): Region | null {
  const t = (address ?? "").trim();
  if (!t) return null;
  const sido = parseSido(t);
  if (!sido) return null;
  const tokens = t.split(/\s+/);
  const idx = tokens.findIndex((tok) => SIDO_ALIASES.some(([, aliases]) => aliases.includes(tok)));
  const next = idx >= 0 ? tokens[idx + 1] : undefined;
  const sigungu = next && /[시군구]$/.test(next) ? next : null;
  return { sido, sigungu };
}

export function regionKey(region: Region): string {
  return `${region.sido}/${region.sigungu ?? ""}`;
}

export function uniqueRegions(regions: Region[]): Region[] {
  const map = new Map<string, Region>();
  for (const r of regions) {
    const key = regionKey(r);
    if (!map.has(key)) map.set(key, r);
  }
  // 시군구가 있는 항목이 있으면 같은 시도의 시군구 없는 항목은 제거하지 않는다(시도 단위 검색용으로 유지).
  return [...map.values()];
}
