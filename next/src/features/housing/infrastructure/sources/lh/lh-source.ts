import type { NoticeSourcePort, SourceAvailability, SourceContext } from "@/features/housing/application/ports/notice-source";
import { todayInKst } from "@/common/domain/date";
import type { NoticeDraft } from "@/features/housing/domain/notice";
import {
  buildUrl,
  DataGoKrError,
  normalizeServiceKey,
  parseDataGoKrBody,
} from "@/common/infrastructure/http/data-go-kr";
import { httpGetText, sleep } from "@/common/infrastructure/http/http";
import { findDeep, findRecords, isRecord, str, toNumber } from "@/common/infrastructure/http/mapping";
import { mapLhItem } from "./lh-mapper";
import { applyLhSupply, mapLhSupply } from "./lh-supply-mapper";

const ENDPOINT = "https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1";
/** 분양임대공고별 공급정보 조회 서비스 (주택형·세대수·금액) */
const SUPPLY_ENDPOINT = "https://apis.data.go.kr/B552555/lhLeaseNoticeSplInfo1/getLeaseNoticeSplInfo1";
/** 공고유형코드: 05 분양주택, 06 임대주택, 13 주거복지, 39 신혼희망타운 (01 토지, 22 상가는 제외) */
const CATEGORY_CODES = ["05", "06", "13", "39"];
const SUPPLY_CONCURRENCY = 4;
const PAGE_SIZE = 100;
const MAX_PAGES = 30;

const dotted = (iso: string) => iso.replaceAll("-", ".");

export interface LhSourceOptions {
  serviceKey?: string;
  getText?: (url: string) => Promise<string>;
  /** 요청 간 대기(ms) */
  delayMs?: number;
  /** 게시일 조회 시작: 오늘로부터 며칠 전 */
  lookbackDays?: number;
  /** 마감일 조회 종료: 오늘로부터 며칠 후 */
  lookaheadDays?: number;
  /** 공고별 공급정보(세대수·금액·주택형) 추가 조회. 기본 true */
  fetchSupply?: boolean;
  /** 공급정보 동시 조회 수 (기본 4) */
  supplyConcurrency?: number;
  /** 공고 하나의 공급정보 조회 실패 등 수집을 막지 않는 문제 알림 */
  onWarn?: (message: string) => void;
}

export class LhSource implements NoticeSourcePort {
  readonly id = "lh" as const;
  readonly label = "LH 분양임대공고";

  constructor(private readonly options: LhSourceOptions) {}

  checkAvailability(): SourceAvailability {
    return this.options.serviceKey
      ? { available: true }
      : { available: false, reason: "DATA_GO_KR_SERVICE_KEY 가 설정되지 않았습니다." };
  }

  async fetchNotices(ctx: SourceContext): Promise<NoticeDraft[]> {
    const key = normalizeServiceKey(this.options.serviceKey ?? "");
    const getText = this.options.getText ?? ((url: string) => httpGetText(url, { signal: ctx.signal }));
    const delay = this.options.delayMs ?? 300;
    const today = todayInKst(new Date(ctx.fetchedAt));

    const shift = (days: number) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const from = dotted(shift(-(this.options.lookbackDays ?? 120)));
    const to = dotted(shift(this.options.lookaheadDays ?? 365));

    const drafts: NoticeDraft[] = [];
    for (const category of CATEGORY_CODES) {
      let fetched = 0;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = buildUrl(ENDPOINT, {
          serviceKey: key,
          PG_SZ: PAGE_SIZE,
          PAGE: page,
          UPP_AIS_TP_CD: category,
          PAN_NT_ST_DT: from,
          CLSG_DT: to,
        });
        const body = parseDataGoKrBody(await getText(url));
        const items = findRecords(body, "dsList");
        for (const item of items) {
          const draft = mapLhItem(item, { fetchedAt: ctx.fetchedAt, today });
          if (draft) drafts.push(draft);
        }
        fetched += items.length;
        const total = toNumber(findDeep(body, "ALL_CNT"));
        if (items.length < PAGE_SIZE || (total !== null && fetched >= total)) break;
        await sleep(delay);
      }
      await sleep(delay);
    }
    return this.options.fetchSupply === false ? drafts : this.enrichWithSupply(drafts, key, getText, delay);
  }

  /** 공고마다 공급정보 API 를 호출해 단지/주택형/세대수/금액을 채운다. 실패한 공고는 목록 정보만 유지한다. */
  private async enrichWithSupply(
    drafts: NoticeDraft[],
    key: string,
    getText: (url: string) => Promise<string>,
    delay: number,
  ): Promise<NoticeDraft[]> {
    const warn = this.options.onWarn ?? (() => {});

    // 1) 조회 대상 계산: 공고(PAN_ID, 공급정보구분코드)별로 한 번만 호출한다.
    const jobs = new Map<string, Record<string, string>>();
    const keyOf = drafts.map((draft) => {
      const item = draft.sources[0]?.raw;
      if (!isRecord(item)) return null;
      const params: Record<string, string | null> = {
        PAN_ID: str(item, "PAN_ID"),
        SPL_INF_TP_CD: str(item, "SPL_INF_TP_CD"),
        CCR_CNNT_SYS_DS_CD: str(item, "CCR_CNNT_SYS_DS_CD"),
        UPP_AIS_TP_CD: str(item, "UPP_AIS_TP_CD"),
        AIS_TP_CD: str(item, "AIS_TP_CD"),
      };
      // 조회에 필요한 값이 없으면 목록 정보만 사용 (AIS_TP_CD 는 선택)
      if (!params.PAN_ID || !params.SPL_INF_TP_CD || !params.CCR_CNNT_SYS_DS_CD || !params.UPP_AIS_TP_CD) return null;
      const cacheKey = `${params.PAN_ID}|${params.SPL_INF_TP_CD}`;
      jobs.set(cacheKey, Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null)) as Record<string, string>);
      return cacheKey;
    });

    // 2) 제한된 동시성으로 조회. 실패한 공고는 body 없이 두고, 일일 한도(22) 초과면 중단한다.
    const bodies = new Map<string, unknown>();
    const queue = [...jobs.entries()];
    let stopped = false;
    const fetchBody = async (params: Record<string, string>): Promise<unknown> => {
      const url = buildUrl(SUPPLY_ENDPOINT, { serviceKey: key, ...params });
      try {
        return parseDataGoKrBody(await getText(url));
      } catch (error) {
        // 초당 호출 한도(23)는 잠깐 쉬었다가 한 번 재시도
        if (error instanceof DataGoKrError && error.code === "23") {
          await sleep(1000);
          return parseDataGoKrBody(await getText(url));
        }
        throw error;
      }
    };
    const worker = async () => {
      while (!stopped) {
        const next = queue.shift();
        if (!next) return;
        const [cacheKey, params] = next;
        try {
          bodies.set(cacheKey, await fetchBody(params));
        } catch (error) {
          warn(`[lh] 공급정보 조회 실패 (${params.PAN_ID}): ${error instanceof Error ? error.message : String(error)}`);
          if (error instanceof DataGoKrError && error.code === "22") {
            stopped = true;
            warn("[lh] 일일 호출 한도를 넘어 나머지 공고의 공급정보 조회를 건너뜁니다.");
          }
        }
        await sleep(delay);
      }
    };
    const workers = Math.min(Math.max(1, this.options.supplyConcurrency ?? SUPPLY_CONCURRENCY), queue.length);
    await Promise.all(Array.from({ length: workers }, worker));

    // 3) 공고에 반영 (원래 순서 유지)
    return drafts.map((draft, i) => {
      const cacheKey = keyOf[i];
      if (!cacheKey || !bodies.has(cacheKey)) return draft;
      const supply = mapLhSupply(bodies.get(cacheKey), {
        region: draft.regions[0] ?? null,
        housingType: draft.housingTypes[0] ?? "other",
      });
      return supply ? applyLhSupply(draft, supply) : draft;
    });
  }
}
