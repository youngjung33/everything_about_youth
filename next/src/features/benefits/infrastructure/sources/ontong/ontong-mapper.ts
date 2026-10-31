import { parseCategoryId } from "@/features/benefits/domain/enums";
import type { BenefitProgramDraft } from "@/features/benefits/domain/program";
import type { Sido } from "@/common/domain/region";
import { SIDO_LIST } from "@/common/domain/region";
import { findDeep, type Json } from "@/common/infrastructure/http/mapping";

function deepStr(root: Json, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = findDeep(root, key);
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    } else if (typeof v === "number" || typeof v === "boolean") return String(v);
  }
  return null;
}

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
  "43": "충북",
  "44": "충남",
  "45": "전북",
  "46": "전남",
  "47": "경북",
  "48": "경남",
  "50": "제주",
};

function parseIsoDate(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 8) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    if (/^\d{4}-\d{2}-\d{2}$/.test(`${y}-${m}-${d}`)) return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function parseRegions(raw: Json): Array<{ sido: Sido; sigungu: string | null }> {
  const regions: Array<{ sido: Sido; sigungu: string | null }> = [];
  const sidoCode = deepStr(raw, "zipCd", "sidoCd", "ctpvCd", "regionCd");
  if (sidoCode && SIDO_BY_CODE[sidoCode.slice(0, 2)]) {
    regions.push({ sido: SIDO_BY_CODE[sidoCode.slice(0, 2)]!, sigungu: deepStr(raw, "sggNm", "sigunguNm") });
  }
  const sidoName = deepStr(raw, "sidoNm", "ctpvNm", "regionNm");
  if (sidoName) {
    const match = SIDO_LIST.find((s) => sidoName.includes(s));
    if (match) regions.push({ sido: match, sigungu: deepStr(raw, "sggNm", "sigunguNm") });
  }
  return regions;
}

function parseTags(raw: Json): string[] {
  const kw = deepStr(raw, "plcyKywdNm", "keyword", "plcyKywd");
  if (!kw) return [];
  return [...new Set(kw.split(/[,·|/]/).map((s) => s.trim()).filter(Boolean))].slice(0, 20);
}

export function mapOntongItem(raw: Json, ctx: { fetchedAt: string; baseUrl: string }): BenefitProgramDraft | null {
  const externalId = deepStr(raw, "plcyId", "plcyNo", "bizId", "policyId");
  const title = deepStr(raw, "plcyNm", "plcyTitle", "bizNm", "title");
  if (!externalId || !title) return null;

  const organization = deepStr(raw, "sprvsnInstCdNm", "instNm", "orgNm", "sprvsnInstNm") ?? "온통청년";
  const categoryText = deepStr(raw, "plcyLclsNm", "plcyMclsNm", "lclsfNm", "mclsfNm", "bizTycdNm");
  const categoryId = parseCategoryId(categoryText);
  const summary = deepStr(raw, "plcyExplnCn", "plcySmryCn", "expln", "summary");
  const urlPath = deepStr(raw, "plcyUrlAddr", "dtlUrl", "linkUrl");
  const url = urlPath ? (urlPath.startsWith("http") ? urlPath : `${ctx.baseUrl}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`) : `${ctx.baseUrl}/opi/youthPlcyDetail.do?plcyId=${externalId}`;

  return {
    title,
    organization,
    categoryId,
    tags: parseTags(raw),
    regions: parseRegions(raw),
    applicationStart: parseIsoDate(deepStr(raw, "aplyBgngYmd", "aplyStrtDt", "rcrtBgngYmd")),
    applicationEnd: parseIsoDate(deepStr(raw, "aplyEndYmd", "aplyEndDt", "rcrtEndYmd")),
    announcementDate: parseIsoDate(deepStr(raw, "frstRegYmd", "regDt", "pblcnYmd")),
    summary,
    url,
    sources: [{ source: "ontong", externalId, url, raw, fetchedAt: ctx.fetchedAt }],
  };
}

export function mapOntongItems(rows: Json[], ctx: { fetchedAt: string; baseUrl?: string }): BenefitProgramDraft[] {
  const baseUrl = ctx.baseUrl ?? "https://www.youthcenter.go.kr";
  const out: BenefitProgramDraft[] = [];
  for (const row of rows) {
    const mapped = mapOntongItem(row, { fetchedAt: ctx.fetchedAt, baseUrl });
    if (mapped) out.push(mapped);
  }
  return out;
}
