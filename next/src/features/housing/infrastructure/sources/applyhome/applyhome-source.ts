import type { NoticeSourcePort, SourceAvailability, SourceContext } from "@/features/housing/application/ports/notice-source";
import { todayInKst } from "@/common/domain/date";
import type { NoticeDraft } from "@/features/housing/domain/notice";
import { buildUrl, normalizeServiceKey, parseDataGoKrBody } from "@/common/infrastructure/http/data-go-kr";
import { httpGetText, sleep } from "@/common/infrastructure/http/http";
import { findDeep, findRecords, toNumber } from "@/common/infrastructure/http/mapping";
import {
  APPLYHOME_ENDPOINTS,
  mapApplyhomeDetail,
  mapApplyhomeModels,
  type ApplyhomeEndpoint,
} from "./applyhome-mapper";

const BASE = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1";
const PER_PAGE = 100;
const MAX_PAGES = 20;

export interface ApplyhomeSourceOptions {
  serviceKey?: string;
  getText?: (url: string) => Promise<string>;
  delayMs?: number;
  /** 모집공고일 조회 시작: 오늘로부터 며칠 전 */
  lookbackDays?: number;
  /** 주택형(면적/분양가) 조회를 접수 마감이 지난 공고에도 할지 여부 (기본 false) */
  includeClosedModels?: boolean;
  onWarn?: (message: string) => void;
}

export class ApplyhomeSource implements NoticeSourcePort {
  readonly id = "applyhome" as const;
  readonly label = "청약홈";

  constructor(private readonly options: ApplyhomeSourceOptions) {}

  checkAvailability(): SourceAvailability {
    return this.options.serviceKey
      ? { available: true }
      : { available: false, reason: "DATA_GO_KR_SERVICE_KEY 가 설정되지 않았습니다." };
  }

  async fetchNotices(ctx: SourceContext): Promise<NoticeDraft[]> {
    const key = normalizeServiceKey(this.options.serviceKey ?? "");
    const getText = this.options.getText ?? ((url: string) => httpGetText(url, { signal: ctx.signal }));
    const delay = this.options.delayMs ?? 200;
    const today = todayInKst(new Date(ctx.fetchedAt));
    const since = new Date(`${today}T00:00:00Z`);
    since.setUTCDate(since.getUTCDate() - (this.options.lookbackDays ?? 90));
    const sinceIso = since.toISOString().slice(0, 10);

    const drafts: NoticeDraft[] = [];
    for (const endpoint of APPLYHOME_ENDPOINTS) {
      const items = await this.fetchAll(endpoint, key, sinceIso, getText, delay);
      for (const item of items) {
        const draft = mapApplyhomeDetail(item, endpoint.kind, { fetchedAt: ctx.fetchedAt });
        if (!draft) continue;

        const needModels = this.options.includeClosedModels || !draft.applicationEnd || draft.applicationEnd >= today;
        if (needModels) {
          const manageNo = String(item.HOUSE_MANAGE_NO ?? "");
          const pblancNo = String(item.PBLANC_NO ?? "");
          try {
            const url = buildUrl(`${BASE}/${endpoint.model}`, {
              serviceKey: key,
              page: 1,
              perPage: PER_PAGE,
              "cond[HOUSE_MANAGE_NO::EQ]": manageNo,
              "cond[PBLANC_NO::EQ]": pblancNo || undefined,
            });
            const models = findRecords(parseDataGoKrBody(await getText(url)), "data");
            const units = mapApplyhomeModels(models);
            if (units.length > 0) draft.complexes[0]!.units = units;
          } catch (e) {
            // 주택형 조회 실패는 공고 자체를 버리지 않는다.
            this.options.onWarn?.(`[applyhome] 주택형 조회 실패 ${manageNo}: ${e instanceof Error ? e.message : String(e)}`);
          }
          await sleep(delay);
        }
        drafts.push(draft);
      }
    }
    return drafts;
  }

  private async fetchAll(
    endpoint: ApplyhomeEndpoint,
    key: string,
    sinceIso: string,
    getText: (url: string) => Promise<string>,
    delay: number,
  ) {
    const all: Array<Record<string, unknown>> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = buildUrl(`${BASE}/${endpoint.detail}`, {
        serviceKey: key,
        page,
        perPage: PER_PAGE,
        "cond[RCRIT_PBLANC_DE::GTE]": sinceIso,
      });
      const body = parseDataGoKrBody(await getText(url));
      const items = findRecords(body, "data");
      all.push(...items);
      const total = toNumber(findDeep(body, "matchCount")) ?? toNumber(findDeep(body, "totalCount"));
      if (items.length < PER_PAGE || (total !== null && all.length >= total)) break;
      await sleep(delay);
    }
    return all;
  }
}
