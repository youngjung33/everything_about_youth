import { parseIsoDate } from "@/common/domain/date";
import { parseHousingType, parseSupplyType, type HousingType } from "@/features/housing/domain/enums";
import type { Complex, NoticeDraft, UnitType } from "@/features/housing/domain/notice";
import { parseRegionFromAddress, parseSido, type Region } from "@/common/domain/region";
import { num, str, type Json } from "@/common/infrastructure/http/mapping";

export interface MyhomeMapContext {
  fetchedAt: string;
}

function positive(n: number | null): number | null {
  return n !== null && n > 0 ? n : null;
}

/**
 * 마이홈포털 공공주택 모집공고(HWSPR02/rsdtRcritNtcList) 응답은 '공고 × 단지' 행 단위이므로
 * 같은 공고ID(pblancId)의 행들을 하나의 공고로 묶는다.
 *
 * 필드명은 문서 기준 후보를 모두 허용한다. (응답 스키마가 바뀌어도 raw 는 보존)
 */
export function mapMyhomeItems(items: Json[], ctx: MyhomeMapContext): NoticeDraft[] {
  const groups = new Map<string, Json[]>();
  for (const item of items) {
    const id = str(item, "pblancId", "pblancNo", "houseSn");
    if (!id) continue;
    (groups.get(id) ?? groups.set(id, []).get(id)!).push(item);
  }

  const drafts: NoticeDraft[] = [];
  for (const [id, rows] of groups) {
    const head = rows[0]!;
    const title = str(head, "pblancNm", "pblancName");
    if (!title) continue;

    const supplyText = str(head, "suplyTyNm") ?? "";
    const houseText = str(head, "houseTyNm") ?? "";
    let supplyType = parseSupplyType(supplyText);
    if (supplyType === "other") supplyType = parseSupplyType(title);

    const complexes: Complex[] = [];
    const regions: Region[] = [];
    const housingTypes = new Set<HousingType>();

    for (const row of rows) {
      const address = str(row, "fullAdres", "rnAdres", "adres", "hsmpAdres");
      const sido = parseSido(str(row, "brtcNm"));
      const sigungu = str(row, "signguNm");
      const fromAddr = parseRegionFromAddress(address);
      const region: Region | null = sido ? { sido, sigungu: sigungu ?? fromAddr?.sigungu ?? null } : fromAddr;
      if (region) regions.push(region);

      const ht = parseHousingType(str(row, "houseTyNm") ?? houseText);
      const housingType: HousingType = ht;
      if (ht !== "other") housingTypes.add(ht);

      const unit: UnitType = {
        name: str(row, "styleNm", "hsmpStyleNm"),
        exclusiveAreaM2: num(row, "suplyPrvuseAr", "prvuseAr", "suplyAr"),
        households: positive(num(row, "sumSuplyCo", "suplyHoCo", "hshldCo")),
        // 응답은 값이 없을 때 0 을 준다. 0원으로 보이지 않도록 null 로 둔다.
        deposit: positive(num(row, "rentGtn", "bassRentGtn", "lfstsGtn")),
        monthlyRent: positive(num(row, "mtRntchrg", "bassMtRntchrg", "rentChrg")),
      };
      const hasUnit = unit.exclusiveAreaM2 !== null || unit.deposit !== null || unit.monthlyRent !== null;

      const name = str(row, "hsmpNm");
      const existing = complexes.find((c) => c.name === name && c.address === address);
      if (existing) {
        if (hasUnit) existing.units.push(unit);
        existing.households = (existing.households ?? 0) + (unit.households ?? 0) || existing.households;
      } else {
        complexes.push({
          name,
          address,
          region,
          housingType,
          households: unit.households,
          units: hasUnit ? [unit] : [],
        });
      }
    }

    const total = complexes.reduce((s, c) => s + (c.households ?? 0), 0);
    const url = str(head, "url", "pcUrl", "mobileUrl", "hmpgAdres");

    drafts.push({
      title,
      organization: str(head, "suplyInsttNm", "insttNm") ?? "공공주택 공급기관",
      supplyType,
      housingTypes: [...housingTypes],
      regions,
      applicationStart: parseIsoDate(str(head, "beginDe", "rcritBeginDe")),
      applicationEnd: parseIsoDate(str(head, "endDe", "rcritEndDe")),
      announcementDate: parseIsoDate(str(head, "rcritPblancDe", "pblancDe")),
      winnerAnnouncementDate: parseIsoDate(str(head, "przwnerPresnatnDe")),
      totalHouseholds: total > 0 ? total : null,
      eligibilityText: str(head, "refrnc", "cnsltTel") ? `문의: ${str(head, "refrnc", "cnsltTel")}` : null,
      url,
      complexes,
      sources: [{ source: "myhome", externalId: id, url, raw: rows.length === 1 ? head : rows, fetchedAt: ctx.fetchedAt }],
    });
  }
  return drafts;
}
