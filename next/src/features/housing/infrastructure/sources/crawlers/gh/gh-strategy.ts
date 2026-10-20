import * as cheerio from "cheerio";
import type { SupplyType } from "@/features/housing/domain/enums";
import type { BoardDetail, BoardRow, BoardStrategy } from "../board-crawler";

const ORIGIN = "https://www.gh.or.kr";
const BOARD = `${ORIGIN}/gh/announcement-of-salerental001.do`;
const PAGE_SIZE = 10;

/**
 * 게시판 '구분' 중 주택과 무관한 것은 목록 단계에서 제외한다.
 * (주택 / 주택매입 / 기타(전세임대 등) 만 남긴다)
 */
const NON_HOUSING_CATEGORIES = new Set(["산업단지", "택지", "상가"]);

/** 게시판은 'YY.MM.DD' 형식으로 등록일을 보여준다. */
export function parseGhDate(text: string): string | null {
  const m = text.trim().match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/);
  if (!m) return null;
  const iso = `20${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** 경기도 31개 시·군. 제목에는 '시' 없이 쓰이는 경우가 많아 접미사를 붙여 돌려준다. */
const GYEONGGI_SIGUNGU = [
  "수원", "성남", "고양", "용인", "부천", "안산", "안양", "남양주", "화성", "평택", "의정부", "시흥", "파주", "김포", "광명",
  "광주", "군포", "하남", "오산", "이천", "안성", "의왕", "양주", "구리", "포천", "여주", "동두천", "과천",
].map((name) => ({ keyword: name, sigungu: `${name}시` }));

GYEONGGI_SIGUNGU.push(
  { keyword: "가평", sigungu: "가평군" },
  { keyword: "양평", sigungu: "양평군" },
  { keyword: "연천", sigungu: "연천군" },
);

/** 지구/단지 별칭 → 시군 */
const ALIASES: Array<{ keyword: string; sigungu: string }> = [
  { keyword: "다산", sigungu: "남양주시" },
  { keyword: "동탄", sigungu: "화성시" },
  { keyword: "고덕", sigungu: "평택시" },
  { keyword: "광교", sigungu: "수원시" },
  { keyword: "교산", sigungu: "하남시" },
  { keyword: "냉천", sigungu: "안양시" },
  { keyword: "평촌", sigungu: "안양시" },
];

export function guessGhSigungu(title: string): string | null {
  // 긴 키워드 우선 (예: '남양주' 가 '양주' 보다 먼저)
  const all = [...GYEONGGI_SIGUNGU, ...ALIASES].sort((a, b) => b.keyword.length - a.keyword.length);
  return all.find((c) => title.includes(c.keyword))?.sigungu ?? null;
}

/** GH 경기주택도시공사 '분양/임대 공고' 게시판 */
export const ghStrategy: BoardStrategy = {
  id: "gh",
  label: "GH경기주택도시공사",
  organization: "경기주택도시공사",
  sido: "경기",
  lists: [
    {
      maxPages: 8,
      url: (page: number) => `${BOARD}?mode=list&articleLimit=${PAGE_SIZE}&article.offset=${(page - 1) * PAGE_SIZE}`,
    },
  ],

  parseList(html: string): BoardRow[] {
    const $ = cheerio.load(html);
    const rows: BoardRow[] = [];
    $("table.board-list-table tbody tr").each((_, tr) => {
      const category = $(tr).find("td.category").text().trim();
      if (NON_HOUSING_CATEGORIES.has(category)) return;
      const a = $(tr).find("td.title a").first();
      const articleNo = new URL(a.attr("href") ?? "", BOARD).searchParams.get("articleNo");
      if (!articleNo) return;
      rows.push({
        externalId: articleNo,
        title: a.text().replace(/\s+/g, " ").trim(),
        postedDate: parseGhDate($(tr).find("td.date").text()),
        detailUrl: `${BOARD}?mode=view&articleNo=${articleNo}`,
      });
    });
    return rows;
  },

  parseDetail(html: string): BoardDetail {
    const $ = cheerio.load(html);
    $("script, style").remove();
    const view = $(".board-view").first();
    return { text: (view.length > 0 ? view : $("body")).text() };
  },

  guessSigungu: guessGhSigungu,

  resolveSupplyType(title: string): SupplyType | null {
    if (/경기\s*행복주택/.test(title)) return "happy_housing";
    return null;
  },
};
