import { parseIsoDate, type IsoDate } from "@/common/domain/date";
import { parseHousingType, parseSupplyType, type HousingType } from "@/features/housing/domain/enums";
import type { NoticeDraft } from "@/features/housing/domain/notice";
import { parseSido } from "@/common/domain/region";
import { str, type Json } from "@/common/infrastructure/http/mapping";

export interface LhMapContext {
  fetchedAt: string;
  /** 오늘(KST) */
  today: IsoDate;
}

const LH_APPLY_URL = "https://apply.lh.or.kr";

const NON_HOUSING_TYPES = /어린이집|상가|토지|점포|주차/;

/** 응답에 PAN_ID 가 없을 때 공고상세URL(`...PAN_ID:0000059133,...`)에서 꺼낸다. */
function panIdFromUrl(url: string | null): string | null {
  return url?.match(/PAN_ID[:=]([0-9A-Za-z]+)/)?.[1] ?? null;
}

function previousDay(date: IsoDate): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * LH 분양임대공고문 조회 서비스(lhLeaseNoticeInfo1) 목록 항목 → NoticeDraft.
 * 목록 API 는 단지/면적/금액 정보가 없으므로 complexes 는 비운다.
 */
export function mapLhItem(item: Json, ctx: LhMapContext): NoticeDraft | null {
  const panId = str(item, "PAN_ID") ?? panIdFromUrl(str(item, "DTL_URL"));
  const title = str(item, "PAN_NM");
  if (!panId || !title) return null;

  const typeName = str(item, "AIS_TP_CD_NM") ?? "";
  const upperName = str(item, "UPP_AIS_TP_NM") ?? "";
  // 주택이 아닌 공고(어린이집·상가·토지 등)는 제외
  if (NON_HOUSING_TYPES.test(`${typeName} ${upperName}`)) return null;
  let supplyType = parseSupplyType(typeName);
  if (supplyType === "other") supplyType = parseSupplyType(`${typeName} ${title}`);
  // LH 의 '분양주택'은 공공분양이다 (parseSupplyType 은 일반 '분양'을 민간분양으로 해석)
  if (supplyType === "private_sale" && /분양/.test(upperName + typeName)) supplyType = "public_sale";

  const housing = parseHousingType(`${typeName} ${title}`);
  const housingTypes: HousingType[] = housing === "other" ? [] : [housing];

  const sido = parseSido(str(item, "CNP_CD_NM"));
  const posted = parseIsoDate(str(item, "PAN_NT_ST_DT", "PAN_DT"));
  let end = parseIsoDate(str(item, "CLSG_DT"));

  // 상태가 이미 마감/당첨자발표인데 마감일이 미래로 남아 있는 경우 보정
  const status = str(item, "PAN_SS") ?? "";
  if (/마감|발표/.test(status) && (!end || end >= ctx.today)) end = previousDay(ctx.today);

  return {
    title,
    organization: "한국토지주택공사",
    supplyType,
    housingTypes,
    regions: sido ? [{ sido, sigungu: null }] : [],
    applicationStart: null,
    applicationEnd: end,
    announcementDate: posted,
    winnerAnnouncementDate: null,
    totalHouseholds: null,
    eligibilityText: status ? `공고 상태: ${status}` : null,
    url: str(item, "DTL_URL") ?? LH_APPLY_URL,
    complexes: [],
    sources: [{ source: "lh", externalId: panId, url: str(item, "DTL_URL"), raw: item, fetchedAt: ctx.fetchedAt }],
  };
}
