import { SourceSkippedError, type NoticeSourcePort, type SourceAvailability, type SourceContext } from "@/features/housing/application/ports/notice-source";
import { todayInKst, type IsoDate } from "@/common/domain/date";
import { parseHousingType, parseSupplyType, type SourceId, type SupplyType } from "@/features/housing/domain/enums";
import type { NoticeDraft } from "@/features/housing/domain/notice";
import type { Region, Sido } from "@/common/domain/region";
import {
  extractAnnouncementDate,
  extractApplicationPeriod,
  extractEligibilityExcerpt,
  extractHouseholds,
  isRecruitmentTitle,
} from "./board-text";
import { RobotsDisallowedError, type FetchText } from "@/common/infrastructure/crawler/crawl-fetcher";

export interface BoardRow {
  externalId: string;
  title: string;
  postedDate: IsoDate | null;
  detailUrl: string;
}

export interface BoardDetail {
  /** 본문 텍스트(공백 정리 전) */
  text: string;
}

/** 소스(공사)별로 달라지는 부분. 나머지(수집 순서, 필터, 정규화)는 BoardCrawlerSource 가 공통 처리한다. */
export interface BoardStrategy {
  id: SourceId;
  label: string;
  organization: string;
  sido: Sido;
  /** 게시판 목록 URL 생성기들 (카테고리별) */
  lists: Array<{ maxPages: number; url: (page: number) => string }>;
  parseList(html: string, listUrl: string): BoardRow[];
  parseDetail(html: string): BoardDetail;
  guessSigungu?(title: string): string | null;
  /** 제목 기반 공급유형 보정 (공사별 고유 명칭) */
  resolveSupplyType?(title: string): SupplyType | null;
}

export interface BoardCrawlerOptions {
  fetchText: FetchText;
  /** 오늘로부터 며칠 전 게시글까지 볼지 */
  lookbackDays?: number;
  /** 접수기간을 알 수 없는 글을 유효한 것으로 볼 최대 경과일 */
  undatedMaxAgeDays?: number;
  onWarn?: (message: string) => void;
}

function shiftDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export class BoardCrawlerSource implements NoticeSourcePort {
  readonly id: SourceId;
  readonly label: string;

  constructor(
    private readonly strategy: BoardStrategy,
    private readonly options: BoardCrawlerOptions,
  ) {
    this.id = strategy.id;
    this.label = strategy.label;
  }

  checkAvailability(): SourceAvailability {
    return { available: true };
  }

  async fetchNotices(ctx: SourceContext): Promise<NoticeDraft[]> {
    const { strategy, options } = this;
    const today = todayInKst(new Date(ctx.fetchedAt));
    const cutoff = shiftDays(today, -(options.lookbackDays ?? 120));
    const undatedCutoff = shiftDays(today, -(options.undatedMaxAgeDays ?? 90));

    const rows = new Map<string, BoardRow>();
    for (const list of strategy.lists) {
      for (let page = 1; page <= list.maxPages; page++) {
        const listUrl = list.url(page);
        let html: string;
        try {
          html = await options.fetchText(listUrl);
        } catch (e) {
          // robots.txt 가 막은 사이트는 실패가 아니라 "건너뜀"으로 다룬다.
          if (e instanceof RobotsDisallowedError) throw new SourceSkippedError(e.message);
          throw e;
        }
        const pageRows = strategy.parseList(html, listUrl);
        if (pageRows.length === 0) break;
        for (const row of pageRows) {
          if (row.postedDate && row.postedDate < cutoff) continue;
          if (!isRecruitmentTitle(row.title)) continue;
          rows.set(row.externalId, row);
        }
        // 최신순 정렬 가정: 마지막 글이 기준일보다 오래되면 다음 페이지는 볼 필요 없음
        const last = pageRows[pageRows.length - 1]!;
        if (last.postedDate && last.postedDate < cutoff) break;
      }
    }

    const drafts: NoticeDraft[] = [];
    for (const row of rows.values()) {
      try {
        const detail = strategy.parseDetail(await options.fetchText(row.detailUrl));
        const draft = this.toDraft(row, detail, ctx.fetchedAt, undatedCutoff);
        if (draft) drafts.push(draft);
      } catch (e) {
        // 상세 한 건의 실패가 전체 수집을 막지 않는다.
        options.onWarn?.(`[${strategy.id}] 상세 조회 실패 ${row.detailUrl}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return drafts;
  }

  private toDraft(row: BoardRow, detail: BoardDetail, fetchedAt: string, undatedCutoff: IsoDate): NoticeDraft | null {
    const { strategy } = this;
    const { start, end } = extractApplicationPeriod(detail.text);

    // 접수기간을 알 수 없는 글은 오래되었으면 이미 끝난 것으로 보고 버린다.
    if (!end && row.postedDate && row.postedDate < undatedCutoff) return null;

    let supplyType = strategy.resolveSupplyType?.(row.title) ?? parseSupplyType(row.title);
    if (supplyType === "other") supplyType = parseSupplyType(`${row.title} ${detail.text.slice(0, 400)}`);

    const housing = parseHousingType(row.title);
    const sigungu = strategy.guessSigungu?.(row.title) ?? null;
    const region: Region = { sido: strategy.sido, sigungu };

    return {
      title: row.title.replace(/\s+/g, " ").trim(),
      organization: strategy.organization,
      supplyType,
      housingTypes: housing === "other" ? [] : [housing],
      regions: [region],
      applicationStart: start,
      applicationEnd: end,
      announcementDate: extractAnnouncementDate(detail.text) ?? row.postedDate,
      winnerAnnouncementDate: null,
      totalHouseholds: extractHouseholds(detail.text),
      eligibilityText: extractEligibilityExcerpt(detail.text),
      url: row.detailUrl,
      complexes: [],
      sources: [
        {
          source: strategy.id,
          externalId: row.externalId,
          url: row.detailUrl,
          raw: { title: row.title, postedDate: row.postedDate, excerpt: detail.text.replace(/\s+/g, " ").trim().slice(0, 1500) },
          fetchedAt,
        },
      ],
    };
  }
}
