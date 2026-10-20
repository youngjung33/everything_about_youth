import { parseIsoDate, type IsoDate } from "@/common/domain/date";
import { parseHousingType, parseSupplyType, type HousingType, type SupplyType } from "@/features/housing/domain/enums";
import type { Complex, NoticeDraft, UnitType } from "@/features/housing/domain/notice";
import { parseRegionFromAddress, parseSido, type Region } from "@/common/domain/region";
import { manwonToWon, num, str, toNumber, type Json } from "@/common/infrastructure/http/mapping";

export type ApplyhomeKind = "apt" | "urbty" | "remndr" | "pblPvtRent";

export interface ApplyhomeEndpoint {
  kind: ApplyhomeKind;
  detail: string;
  model: string;
}

/** 청약홈 분양정보 조회 서비스(ApplyhomeInfoDetailSvc) 의 상세/주택형 오퍼레이션 쌍 */
export const APPLYHOME_ENDPOINTS: ApplyhomeEndpoint[] = [
  { kind: "apt", detail: "getAPTLttotPblancDetail", model: "getAPTLttotPblancMdl" },
  { kind: "urbty", detail: "getUrbtyOfctlLttotPblancDetail", model: "getUrbtyOfctlLttotPblancMdl" },
  { kind: "remndr", detail: "getRemndrLttotPblancDetail", model: "getRemndrLttotPblancMdl" },
  { kind: "pblPvtRent", detail: "getPblPvtRentLttotPblancDetail", model: "getPblPvtRentLttotPblancMdl" },
];

export interface ApplyhomeMapContext {
  fetchedAt: string;
}

/** 접수 관련 날짜 컬럼들에서 가장 이른 시작일 / 가장 늦은 종료일을 계산한다. (특별공급·1순위·2순위 등 포함) */
export function pickApplicationPeriod(item: Json): { start: IsoDate | null; end: IsoDate | null } {
  const starts: IsoDate[] = [];
  const ends: IsoDate[] = [];
  for (const [key, value] of Object.entries(item)) {
    // 잔여세대/오피스텔/공공지원민간임대는 SUBSCRPT_RCEPT_BGNDE/ENDDE 한 쌍으로 접수기간을 준다.
    const isReception =
      /^(RCEPT|SUBSCRPT_RCEPT|SPSPLY_RCEPT|GNRL_RNK|GNRL_RCEPT|SPSPLY)/.test(key) || key.includes("RCPT");
    if (!isReception) continue;
    const date = parseIsoDate(typeof value === "string" || typeof value === "number" ? value : null);
    if (!date) continue;
    if (/(BGNDE|RCPTDE)$/.test(key)) starts.push(date);
    else if (/ENDDE$/.test(key)) ends.push(date);
  }
  starts.sort();
  ends.sort();
  return { start: starts[0] ?? null, end: ends[ends.length - 1] ?? null };
}

function resolveSupplyType(kind: ApplyhomeKind, item: Json, title: string): SupplyType {
  const secd = str(item, "HOUSE_SECD_NM") ?? "";
  const dtl = str(item, "HOUSE_DTL_SECD_NM") ?? "";
  const rent = str(item, "RENT_SECD_NM") ?? "";
  const all = `${secd} ${dtl} ${title}`;

  if (/신혼희망타운/.test(all)) return "newlywed_hope_town";
  if (kind === "pblPvtRent") return "public_support_rental";
  if (/공공지원/.test(all)) return "public_support_rental";
  if (kind === "urbty" && /민간임대/.test(secd + dtl)) return "private_rental";
  if (/임대/.test(rent)) return "private_rental";
  const parsed = parseSupplyType(`${dtl}`);
  if (/국민/.test(dtl)) return "public_sale";
  if (parsed === "private_rental") return "private_rental";
  return "private_sale";
}

export function mapApplyhomeDetail(item: Json, kind: ApplyhomeKind, ctx: ApplyhomeMapContext): NoticeDraft | null {
  const manageNo = str(item, "HOUSE_MANAGE_NO");
  const title = str(item, "HOUSE_NM");
  if (!manageNo || !title) return null;
  const pblancNo = str(item, "PBLANC_NO") ?? "";

  const address = str(item, "HSSPLY_ADRES");
  const addrRegion = parseRegionFromAddress(address);
  const sido = parseSido(str(item, "SUBSCRPT_AREA_CODE_NM")) ?? addrRegion?.sido ?? null;
  const region: Region | null = sido ? { sido, sigungu: addrRegion?.sido === sido ? addrRegion.sigungu : null } : null;

  const typeText = `${str(item, "HOUSE_SECD_NM") ?? ""} ${str(item, "HOUSE_DTL_SECD_NM") ?? ""}`;
  let housingType: HousingType = parseHousingType(typeText);
  if (housingType === "other" && (kind === "apt" || kind === "remndr" || kind === "pblPvtRent")) housingType = "apartment";

  const { start, end } = pickApplicationPeriod(item);
  const url = str(item, "PBLANC_URL", "HMPG_ADRES");
  const households = num(item, "TOT_SUPLY_HSHLDCO");

  const complex: Complex = { name: title, address, region, housingType, households, units: [] };

  return {
    title,
    organization: str(item, "BSNS_MBY_NM", "CNSTRCT_ENTRPS_NM") ?? "사업주체 미상",
    supplyType: resolveSupplyType(kind, item, title),
    housingTypes: housingType === "other" ? [] : [housingType],
    regions: region ? [region] : [],
    applicationStart: start,
    applicationEnd: end,
    announcementDate: parseIsoDate(str(item, "RCRIT_PBLANC_DE")),
    winnerAnnouncementDate: parseIsoDate(str(item, "PRZWNER_PRESNATN_DE")),
    totalHouseholds: households,
    eligibilityText: str(item, "MDHS_TELNO") ? `분양 문의: ${str(item, "MDHS_TELNO")}` : null,
    url,
    complexes: [complex],
    sources: [
      {
        source: "applyhome",
        externalId: `${kind}:${manageNo}:${pblancNo}`,
        url,
        raw: item,
        fetchedAt: ctx.fetchedAt,
      },
    ],
  };
}

/** 주택형별 분양정보 → 세대유형. 금액(LTTOT_TOP_AMOUNT 등)은 만원 단위 */
export function mapApplyhomeModels(models: Json[]): UnitType[] {
  return models.map((m) => {
    const houseTy = str(m, "HOUSE_TY", "MODEL_NM");
    const general = num(m, "SUPLY_HSHLDCO");
    const special = num(m, "SPSPLY_HSHLDCO");
    const households = general === null && special === null ? null : (general ?? 0) + (special ?? 0);
    // 주택형 "084.9587A" 의 숫자부가 전용면적. 별도 전용면적 컬럼이 있으면 우선.
    const area = num(m, "EXCLUSE_AR") ?? toNumber(houseTy);
    return {
      name: houseTy,
      exclusiveAreaM2: area,
      households,
      deposit: manwonToWon(num(m, "LTTOT_TOP_AMOUNT", "SUPLY_AMOUNT")),
      monthlyRent: null,
    };
  });
}
