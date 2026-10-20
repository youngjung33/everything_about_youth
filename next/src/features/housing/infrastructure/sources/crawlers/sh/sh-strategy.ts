import * as cheerio from "cheerio";
import { parseIsoDate } from "@/common/domain/date";
import type { SupplyType } from "@/features/housing/domain/enums";
import type { BoardDetail, BoardRow, BoardStrategy } from "../board-crawler";
import { guessSigungu, SEOUL_GU } from "../board-text";

const BASE = "https://www.i-sh.co.kr/main/lay2/program/S1T294C295/www/brd/m_241/";

/** SH서울주택도시개발공사 '공고 및 공지' 게시판 (1 주택분양, 2 주택임대, 3 주택매입) */
export const shStrategy: BoardStrategy = {
  id: "sh",
  label: "SH서울주택도시개발공사",
  organization: "서울주택도시공사",
  sido: "서울",
  lists: [1, 2, 3].map((category) => ({
    maxPages: 4,
    url: (page: number) => `${BASE}list.do?multi_itm_seq=${category}&page=${page}`,
  })),

  parseList(html: string, listUrl: string): BoardRow[] {
    const $ = cheerio.load(html);
    const category = new URL(listUrl).searchParams.get("multi_itm_seq") ?? "2";
    const rows: BoardRow[] = [];
    $("#listTb tbody tr").each((_, tr) => {
      const a = $(tr).find("td.txtL a").first();
      const onclick = a.attr("onclick") ?? "";
      const seq = onclick.match(/getDetailView\('(\d+)'\)/)?.[1];
      if (!seq) return;
      const title = a.text().replace(/\bNEW\b/, "").replace(/\s+/g, " ").trim();
      const posted = parseIsoDate($(tr).find("td.num").first().text());
      rows.push({
        externalId: seq,
        title,
        postedDate: posted,
        detailUrl: `${BASE}view.do?seq=${seq}&multi_itm_seq=${category}`,
      });
    });
    return rows;
  },

  parseDetail(html: string): BoardDetail {
    const $ = cheerio.load(html);
    // 본문은 '등록일' 이 들어있는 첫 번째 표 안에 있다.
    const table = $("table")
      .filter((_, t) => $(t).text().includes("등록일"))
      .first();
    const text = (table.length ? table : $("body")).text();
    return { text };
  },

  guessSigungu: (title) => guessSigungu(title, SEOUL_GU),

  resolveSupplyType(title: string): SupplyType | null {
    if (/청년안심주택/.test(title)) return "public_support_rental";
    if (/미리내집|장기안심/.test(title)) return "long_term_jeonse";
    return null;
  },
};
