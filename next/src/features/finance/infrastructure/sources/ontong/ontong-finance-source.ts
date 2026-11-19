import type { Logger } from "@/common/application/system";
import type { SchemeSourcePort, SourceAvailability, SourceContext } from "@/features/finance/application/ports/scheme-source";
import type { FinanceSchemeDraft } from "@/features/finance/domain/scheme";
import { httpGetText, sleep } from "@/common/infrastructure/http/http";
import { findDeep, findRecords, toNumber, type Json } from "@/common/infrastructure/http/mapping";
import { enrichOntongListRows } from "@/common/infrastructure/sources/ontong/ontong-detail-fetch";
import { parseOntongBody } from "@/common/infrastructure/sources/ontong/ontong-parse";
import { mapOntongFinanceItems } from "./ontong-finance-mapper";

const BASE_URL = "https://www.youthcenter.go.kr";
const LIST_PATH = "/opi/youthPlcyList.do";
const PAGE_SIZE = 100;
const MAX_PAGES = 30; // 상한 페이지(과도한 호출 방지)

export interface OntongFinanceSourceOptions {
  apiKey?: string;
  logger?: Logger;
  getText?: (url: string) => Promise<string>;
  delayMs?: number;
}

/** 온통청년 응답 본문을 JSON 으로 파싱 */
function parseBody(text: string): Json {
  return parseOntongBody(text);
}

/** 온통청년 Open API 금융·자금 정책 목록 소스 */
export class OntongFinanceSource implements SchemeSourcePort {
  readonly id = "ontong-finance" as const;
  readonly label = "온통청년";

  constructor(private readonly options: OntongFinanceSourceOptions) {}

  checkAvailability(): SourceAvailability {
    return this.options.apiKey
      ? { available: true }
      : { available: false, reason: "BENEFITS_ONTONG_API_KEY 가 설정되지 않았습니다." };
  }

  async fetchSchemes(ctx: SourceContext): Promise<FinanceSchemeDraft[]> {
    const key = this.options.apiKey ?? "";
    const getText = this.options.getText ?? ((url: string) => httpGetText(url, { signal: ctx.signal }));
    const delay = this.options.delayMs ?? 300;

    const rows: Json[] = [];
    const seen = new Set<string>();

    for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
      const url = new URL(LIST_PATH, BASE_URL);
      url.searchParams.set("openApiVlak", key);
      url.searchParams.set("pageIndex", String(pageIndex));
      url.searchParams.set("display", String(PAGE_SIZE));

      const body = parseBody(await getText(url.toString()));
      const items = findRecords(body, "youthPlcy", "item", "items", "result", "list");
      if (items.length === 0) break;

      for (const item of items) {
        const signature = JSON.stringify(item);
        if (seen.has(signature)) continue;
        seen.add(signature);
        rows.push(item);
      }

      const total =
        toNumber(findDeep(body, "totalCount")) ?? toNumber(findDeep(body, "totCount")) ?? toNumber(findDeep(body, "total"));
      if (items.length < PAGE_SIZE || (total !== null && rows.length >= total)) break;
      await sleep(delay);
    }

    const enriched = await enrichOntongListRows(rows, {
      apiKey: key,
      baseUrl: BASE_URL,
      getText,
      signal: ctx.signal,
      delayMs: delay,
      logger: this.options.logger,
    });

    return mapOntongFinanceItems(enriched, { fetchedAt: ctx.fetchedAt, baseUrl: BASE_URL });
  }
}
