import type { Logger } from "@/common/application/system";
import { findDeep, findRecords, type Json } from "@/common/infrastructure/http/mapping";
import { sleep } from "@/common/infrastructure/http/http";
import { parseOntongBody } from "./ontong-parse";
import {
  buildOntongSummaryText,
  needsOntongDetailEnrichment,
  readOntongListSummary,
  readOntongPolicyId,
} from "./ontong-summary";

const LIST_PATH = "/opi/youthPlcyList.do";
const DETAIL_PATH = "/opi/youthPlcyDetail.do";

export interface OntongDetailFetchOptions {
  apiKey: string;
  baseUrl?: string;
  getText: (url: string) => Promise<string>;
  signal?: AbortSignal;
  delayMs?: number;
  logger?: Logger;
}

function unwrapOntongItem(node: Json): Json | null {
  if (readOntongPolicyId(node)) return node;
  const item = node.item;
  if (item && typeof item === "object" && !Array.isArray(item) && readOntongPolicyId(item as Json)) {
    return item as Json;
  }
  return null;
}

function detailRecordFromBody(body: Json): Json | null {
  const items = findRecords(body, "item", "youthPlcy", "items", "result", "list");
  if (items.length > 0) {
    const unwrapped = unwrapOntongItem(items[0]!);
    if (unwrapped) return unwrapped;
  }
  const yp = findDeep(body, "youthPlcy");
  if (yp && typeof yp === "object") {
    const unwrapped = unwrapOntongItem(yp as Json);
    if (unwrapped) return unwrapped;
  }
  return unwrapOntongItem(body);
}

async function fetchDetailOnce(
  url: URL,
  getText: (url: string) => Promise<string>,
  signal?: AbortSignal,
): Promise<Json | null> {
  const text = await getText(url.toString());
  if (signal?.aborted) throw signal.reason ?? new Error("aborted");
  return detailRecordFromBody(parseOntongBody(text));
}

/** 정책 id 로 상세 OPEN API 레코드를 가져온다. 목록 URL(srchPolicyId) → Detail URL 순. */
export async function fetchOntongPolicyDetailRecord(
  policyId: string,
  opts: OntongDetailFetchOptions,
): Promise<Json | null> {
  const base = opts.baseUrl ?? "https://www.youthcenter.go.kr";
  const key = opts.apiKey;

  const listUrl = new URL(LIST_PATH, base);
  listUrl.searchParams.set("openApiVlak", key);
  listUrl.searchParams.set("pageIndex", "1");
  listUrl.searchParams.set("display", "1");
  listUrl.searchParams.set("srchPolicyId", policyId);

  const detailUrl = new URL(DETAIL_PATH, base);
  detailUrl.searchParams.set("openApiVlak", key);
  detailUrl.searchParams.set("srchPolicyId", policyId);

  try {
    const fromList = await fetchDetailOnce(listUrl, opts.getText, opts.signal);
    if (fromList) return fromList;
  } catch {
    /* try alternate endpoint */
  }

  try {
    return await fetchDetailOnce(detailUrl, opts.getText, opts.signal);
  } catch {
    return null;
  }
}

/** 요약이 짧은 목록 row 에 상세 API로 본문 필드를 보강한다. */
export async function enrichOntongListRows(rows: Json[], opts: OntongDetailFetchOptions): Promise<Json[]> {
  const delay = opts.delayMs ?? 300;
  const out: Json[] = [];

  for (const row of rows) {
    const policyId = readOntongPolicyId(row);
    const listSummary = readOntongListSummary(row);

    if (!policyId || !needsOntongDetailEnrichment(row)) {
      out.push(row);
      continue;
    }

    const detail = await fetchOntongPolicyDetailRecord(policyId, opts);
    if (detail) {
      const mergedRow = { ...row, ...detail };
      const summary = buildOntongSummaryText(mergedRow, listSummary);
      out.push(summary ? { ...mergedRow, plcyExplnCn: summary } : mergedRow);
    } else {
      opts.logger?.warn(`[ontong-detail] 상세 없음 plcyId=${policyId}`);
      out.push(row);
    }

    await sleep(delay);
  }

  return out;
}
