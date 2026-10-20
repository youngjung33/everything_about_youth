import { parseRegionFromAddress, type Region } from "@/common/domain/region";
import { isRecord, str, type Json } from "@/common/infrastructure/http/mapping";
import type { Complex, NoticeDraft, UnitType } from "@/features/housing/domain/notice";

/**
 * LH 분양임대공고별 공급정보(lhLeaseNoticeSplInfo1/getLeaseNoticeSplInfo1) 응답 → 단지/세대유형.
 *
 * 응답 형식이 공급정보구분코드(SPL_INF_TP_CD)에 따라 3가지로 갈린다. (실제 응답으로 확인)
 *  - A) 분양·공공임대(390/050/060 등): dsList01~05, 단지=BZDT_NM, 주택형=HTY_NM, 전용면적=RSDN_DDO_AR,
 *       금회공급=SIL_HSH_CNT, 총세대=TOT_HSH_CNT, 분양가=SIL_AMT, 보증금=LS_GMY, 월임대료=MM_RFE
 *  - B) 행복·국민·영구·통합공공임대(062/063): dsList01, 단지=SBD_LGO_NM, 주택형=HTY_NNA, 전용면적=DDO_AR,
 *       금회공급=NOW_HSH_CNT, 총세대=HSH_CNT, 보증금=LS_GMY, 월임대료=RFE ("공고문 참조" 문자열인 경우가 많음)
 *  - C) 매입임대(144): dsList01, 지역=SGG_NM, 주택=DNG_HS_ADR, 주택형(범위)=HTY_DS_NM, 공급호수=LTR_SPL_RMNO
 *  - D) 일반 매입임대(136): dsList01, 호별 목록. 호수=HO_NO, 주택=SBD_LGO_NM, 주소=ADR, 전용면적=DDO_AR, 층=VLD_VL_NM (1행 = 1호)
 * 알 수 없는 형식(토지·상가, 모집인원만 있는 135 등)의 행은 무시한다.
 * 금회공급 세대수가 0 인 행(예비입주자 모집 등)은 세대수 없음(null)으로 둔다.
 */

interface SupplyRow {
  complexName: string | null;
  address: string | null;
  unitName: string | null;
  areaM2: number | null;
  households: number | null;
  deposit: number | null;
  monthlyRent: number | null;
}

/** "12,000" / 12000 / "55.86" 만 숫자로 인정한다. ("공고문 참조", "10~20만원" 같은 문자열은 null) */
function exact(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d[\d,]*(\.\d+)?$/.test(text)) return null;
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

const positive = (n: number | null): number | null => (n !== null && n > 0 ? n : null);

function toRow(row: Json): SupplyRow | null {
  if ("HO_NO" in row && "SBD_LGO_NM" in row) {
    const floor = str(row, "VLD_VL_NM");
    return {
      complexName: str(row, "SBD_LGO_NM"),
      address: str(row, "ADR"),
      unitName: [str(row, "HO_NO"), floor ? `(${floor})` : null].filter(Boolean).join(" ") || null,
      areaM2: positive(exact(row.DDO_AR)),
      households: 1,
      deposit: null,
      monthlyRent: null,
    };
  }
  if ("SBD_LGO_NM" in row && "HTY_NNA" in row) {
    return {
      complexName: str(row, "SBD_LGO_NM"),
      address: null,
      unitName: str(row, "HTY_NNA"),
      areaM2: positive(exact(row.DDO_AR)),
      households: positive(exact(row.NOW_HSH_CNT)),
      deposit: positive(exact(row.LS_GMY)),
      monthlyRent: positive(exact(row.RFE)),
    };
  }
  if ("BZDT_NM" in row) {
    return {
      complexName: str(row, "BZDT_NM"),
      address: null,
      unitName: str(row, "HTY_NM"),
      areaM2: positive(exact(row.RSDN_DDO_AR)),
      households: positive(exact(row.SIL_HSH_CNT)),
      // 분양은 평균분양가격, 임대는 임대보증금
      deposit: positive(exact(row.SIL_AMT) ?? exact(row.LS_GMY)),
      monthlyRent: positive(exact(row.MM_RFE)),
    };
  }
  if ("DNG_HS_ADR" in row) {
    return {
      complexName: str(row, "DNG_HS_ADR"),
      address: str(row, "SGG_NM"),
      unitName: str(row, "HTY_DS_NM"),
      areaM2: null, // "60~70㎡" 같은 범위라 면적으로 쓰지 않는다
      households: positive(exact(row.LTR_SPL_RMNO)),
      deposit: null,
      monthlyRent: null,
    };
  }
  return null;
}

/** 응답 트리에서 dsList01, dsList02 … (…Nm 은 컬럼 설명이므로 제외) 의 행을 모은다. */
function collectRows(root: unknown, out: Json[] = []): Json[] {
  if (Array.isArray(root)) {
    for (const el of root) collectRows(el, out);
  } else if (isRecord(root)) {
    for (const [key, value] of Object.entries(root)) {
      if (/^dsList\d+$/.test(key) && Array.isArray(value)) out.push(...value.filter(isRecord));
      else if (!/^dsList\d+Nm$/.test(key)) collectRows(value, out);
    }
  }
  return out;
}

export interface LhSupply {
  complexes: Complex[];
  totalHouseholds: number | null;
}

/** 공급정보가 없거나 알 수 없는 형식이면 null */
export function mapLhSupply(body: unknown, defaults: { region: Region | null; housingType: Complex["housingType"] }): LhSupply | null {
  const rows = collectRows(body)
    .map(toRow)
    .filter((r): r is SupplyRow => r !== null);
  if (rows.length === 0) return null;

  const complexes = new Map<string, Complex>();
  for (const r of rows) {
    const key = `${r.complexName ?? ""}|${r.address ?? ""}`;
    let complex = complexes.get(key);
    if (!complex) {
      complex = {
        name: r.complexName,
        address: r.address,
        region: parseRegionFromAddress(r.address) ?? defaults.region,
        housingType: defaults.housingType,
        households: null,
        units: [],
      };
      complexes.set(key, complex);
    }
    const unit: UnitType = {
      name: r.unitName,
      exclusiveAreaM2: r.areaM2,
      households: r.households,
      deposit: r.deposit,
      monthlyRent: r.monthlyRent,
    };
    complex.units.push(unit);
    if (r.households !== null) complex.households = (complex.households ?? 0) + r.households;
  }

  const list = [...complexes.values()];
  const total = list.reduce((sum, c) => sum + (c.households ?? 0), 0);
  return { complexes: list, totalHouseholds: total > 0 ? total : null };
}

/** 공급정보를 공고에 반영한다. 더 구체적인(시군구까지 있는) 지역은 시도 단위 지역을 대체한다. */
export function applyLhSupply(draft: NoticeDraft, supply: LhSupply): NoticeDraft {
  const specific: Region[] = [];
  const seen = new Set<string>();
  for (const c of supply.complexes) {
    const r = c.region;
    if (!r?.sigungu) continue;
    const key = `${r.sido}|${r.sigungu}`;
    if (seen.has(key)) continue;
    seen.add(key);
    specific.push(r);
  }
  const coveredSido = new Set(specific.map((r) => r.sido));
  const regions = [...specific, ...draft.regions.filter((r) => r.sigungu || !coveredSido.has(r.sido))];

  return {
    ...draft,
    regions,
    complexes: supply.complexes,
    totalHouseholds: supply.totalHouseholds ?? draft.totalHouseholds,
  };
}
