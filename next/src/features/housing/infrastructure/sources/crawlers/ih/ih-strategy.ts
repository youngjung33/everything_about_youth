import * as cheerio from "cheerio";
import { parseIsoDate } from "@/common/domain/date";
import type { SupplyType } from "@/features/housing/domain/enums";
import type { BoardDetail, BoardRow, BoardStrategy } from "../board-crawler";
import { guessSigungu, INCHEON_SIGUNGU } from "../board-text";

const ORIGIN = "https://www.ih.co.kr";

/** iH 인천도시공사 '입주자모집공고' 게시판 (일반 공지) */
export const ihStrategy: BoardStrategy = {
  id: "ih",
  label: "iH인천도시공사",
  organization: "인천도시공사",
  sido: "인천",
  lists: [
    {
      maxPages: 10,
      url: (page: number) => `${ORIGIN}/main/bbs/bbsMsgList.do?bcd=notice&cate1=general&pgdiv=general&pgno=${page}`,
    },
  ],

  parseList(html: string): BoardRow[] {
    const $ = cheerio.load(html);
    const rows: BoardRow[] = [];
    $("p.title a[href*='bbsMsgDetail']").each((_, a) => {
      const href = $(a).attr("href") ?? "";
      const params = new URL(href, ORIGIN).searchParams;
      const seq = params.get("msg_seq");
      if (!seq || params.get("bcd") !== "notice") return;
      const li = $(a).closest("li");
      const posted = parseIsoDate(li.find("li[title='작성일']").first().text());
      rows.push({
        externalId: seq,
        title: $(a).text().replace(/\s+/g, " ").trim(),
        postedDate: posted,
        detailUrl: `${ORIGIN}/main/bbs/bbsMsgDetail.do?bcd=notice&cate1=general&msg_seq=${seq}&pgdiv=general`,
      });
    });
    return rows;
  },

  parseDetail(html: string): BoardDetail {
    const $ = cheerio.load(html);
    $("script, style").remove();
    const text = $("body").text();
    // 본문은 '작성일' 이후부터 의미가 있다 (상단 공유/네비게이션 텍스트 제거)
    const idx = text.indexOf("작성일");
    return { text: idx >= 0 ? text.slice(idx) : text };
  },

  guessSigungu: (title) => guessSigungu(title, INCHEON_SIGUNGU),

  resolveSupplyType(title: string): SupplyType | null {
    if (/천원주택/.test(title)) return "jeonse_rental";
    return null;
  },
};
