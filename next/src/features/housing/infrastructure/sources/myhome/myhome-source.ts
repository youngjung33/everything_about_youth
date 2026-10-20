import type { NoticeSourcePort, SourceAvailability, SourceContext } from "@/features/housing/application/ports/notice-source";
import type { NoticeDraft } from "@/features/housing/domain/notice";
import { buildUrl, normalizeServiceKey, parseDataGoKrBody } from "@/common/infrastructure/http/data-go-kr";
import { httpGetText, sleep } from "@/common/infrastructure/http/http";
import { findDeep, findRecords, toNumber, type Json } from "@/common/infrastructure/http/mapping";
import { mapMyhomeItems } from "./myhome-mapper";

const ENDPOINT = "https://apis.data.go.kr/1613000/HWSPR02/rsdtRcritNtcList";
/** 시도 코드 (법정동 앞 2자리) */
const BRTC_CODES = ["11", "26", "27", "28", "29", "30", "31", "36", "41", "42", "43", "44", "45", "46", "47", "48", "50"];
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export interface MyhomeSourceOptions {
  serviceKey?: string;
  getText?: (url: string) => Promise<string>;
  delayMs?: number;
}

export class MyhomeSource implements NoticeSourcePort {
  readonly id = "myhome" as const;
  readonly label = "마이홈포털";

  constructor(private readonly options: MyhomeSourceOptions) {}

  checkAvailability(): SourceAvailability {
    return this.options.serviceKey
      ? { available: true }
      : { available: false, reason: "DATA_GO_KR_SERVICE_KEY 가 설정되지 않았습니다." };
  }

  async fetchNotices(ctx: SourceContext): Promise<NoticeDraft[]> {
    const key = normalizeServiceKey(this.options.serviceKey ?? "");
    const getText = this.options.getText ?? ((url: string) => httpGetText(url, { signal: ctx.signal }));
    const delay = this.options.delayMs ?? 250;

    // 현재 모집중 공고만 제공되는 API. 시도별로 조회한다.
    const rows: Json[] = [];
    const seen = new Set<string>();
    for (const brtcCode of BRTC_CODES) {
      let fetched = 0;
      for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
        const url = buildUrl(ENDPOINT, { serviceKey: key, brtcCode, numOfRows: PAGE_SIZE, pageNo });
        const body = parseDataGoKrBody(await getText(url));
        const items = findRecords(body, "item", "items");
        for (const item of items) {
          const signature = JSON.stringify(item);
          if (seen.has(signature)) continue;
          seen.add(signature);
          rows.push(item);
        }
        fetched += items.length;
        const total = toNumber(findDeep(body, "totalCount"));
        if (items.length < PAGE_SIZE || (total !== null && fetched >= total)) break;
        await sleep(delay);
      }
      await sleep(delay);
    }
    return mapMyhomeItems(rows, { fetchedAt: ctx.fetchedAt });
  }
}
