import { describe, expect, it } from "vitest";
import { RobotsDisallowedError } from "@/common/infrastructure/crawler/crawl-fetcher";
import { SourceSkippedError } from "@/features/housing/application/ports/notice-source";
import { BoardCrawlerSource } from "./board-crawler";
import {
  extractAnnouncementDate,
  extractApplicationPeriod,
  extractHouseholds,
  guessSigungu,
  INCHEON_SIGUNGU,
  isRecruitmentTitle,
  SEOUL_GU,
} from "./board-text";
import { ghStrategy, guessGhSigungu, parseGhDate } from "./gh/gh-strategy";
import { ihStrategy } from "./ih/ih-strategy";
import { shStrategy } from "./sh/sh-strategy";

const FETCHED_AT = "2026-10-12T03:00:00.000Z";

describe("board text 추출", () => {
  it("접수기간(전체 날짜 / 연도 생략 / 단일일)", () => {
    expect(extractApplicationPeriod("■ 접수기간 : 2026. 10. 26.(월) ~ 2026.11. 06.(금) 18시까지")).toEqual({ start: "2026-10-26", end: "2026-11-06" });
    expect(extractApplicationPeriod("신청기간: 2026.12.28 ~ 1.5")).toEqual({ start: "2026-12-28", end: "2027-01-05" });
    expect(extractApplicationPeriod("접수기간 2026.10.20.(화) 10:00")).toEqual({ start: "2026-10-20", end: "2026-10-20" });
    expect(extractApplicationPeriod("접수 안내 없음")).toEqual({ start: null, end: null });
  });
  it("공고일/공급호수", () => {
    expect(extractAnnouncementDate("■ 모집공고일 : 2026.10.12.(월)")).toBe("2026-10-12");
    expect(extractHouseholds("■ 공급호수 : 1,234세대")).toBe(1234);
    expect(extractHouseholds("■ 공급호수 : 2세대")).toBe(2);
  });
  it("모집 공고만 통과시킨다", () => {
    expect(isRecruitmentTitle("은평구 홀몸어르신 은빛주택(수요자맞춤형) 잔여세대 모집 공고")).toBe(true);
    expect(isRecruitmentTitle("2026년 기존주택 매입임대(청년형) 예비입주자 모집 공고")).toBe(true);
    expect(isRecruitmentTitle("2026년 국민임대주택 입주자 모집공고(2026.8.20.) 서류심사대상자 발표 및 서류제출 안내")).toBe(false);
    expect(isRecruitmentTitle("2026년 성북구 연극인주택 잔여세대 입주자 모집공고(26. 7. 8.) 당첨자발표 및 계약안내")).toBe(false);
    expect(isRecruitmentTitle("장기안심주택 2027년 3월 재계약 대상자 입주자격 심사서류 제출 안내")).toBe(false);
    expect(isRecruitmentTitle("2026년 임대아파트 단지 내 상가 입점자 모집 공고(청학)")).toBe(false);
    expect(isRecruitmentTitle("2026년 3차 우리집(만석, 만석3) 예비자 동호수 추첨결과 발표")).toBe(false);
  });
  it("시군구 추정은 긴 이름 우선", () => {
    expect(guessSigungu("동대문구 청년주택 모집", SEOUL_GU)).toBe("동대문구");
    expect(guessSigungu("서구 매입임대 모집", INCHEON_SIGUNGU)).toBe("서구");
  });
});

// ---- SH 실제 마크업 구조(2026-10 관찰)를 축약한 fixture
const shListHtml = (rows: Array<{ seq: string; title: string; date: string }>) => `
<div id="listTb" class="listTable colRm"><table><tbody>
${rows
  .map(
    (r, i) => `<tr><td>${1700 - i}</td><td class="txtL"><a href="#" class="ellipsis icon" onclick="javascript:getDetailView('${r.seq}');return false;"><span class="icoNew">NEW</span> ${r.title} </a></td>
<td> 맞춤주택공급부 </td><td class="num"> ${r.date} </td><td class="num">1653</td></tr>`,
  )
  .join("\n")}
</tbody></table></div>`;

const shDetailHtml = `<html><body><nav>분양주택 뉴스 임대주택사업</nav>
<table><tr><td>은평구 홀몸어르신 은빛주택(수요자맞춤형) 잔여세대 모집 공고 등록일 : 2026-10-12 조회수 : 1,657
<div>■ 모집공고일 : 2026.10.12.(월) ■ 공급호수 : 2세대 ■ 신청자격 : 첨부된 모집공고문 3~4페이지 참조 ■ 접수기간 : 2026. 10. 26.(월) ~ 2026.11. 06.(금) 18시까지</div></td></tr></table>
<table><tr><td>이전글/다음글</td></tr></table></body></html>`;

describe("SH 크롤러", () => {
  const listHtml = shListHtml([
    { seq: "311349", title: "은평구 홀몸어르신 은빛주택(수요자맞춤형) 잔여세대 모집 공고", date: "2026-10-12" },
    { seq: "311194", title: "2026년 국민임대주택 입주자 모집공고(2026.8.20.) 서류심사대상자 발표 및 서류제출 안내", date: "2026-10-12" },
    { seq: "300001", title: "오래된 임대주택 입주자 모집 공고", date: "2026-01-02" },
  ]);

  it("목록 파싱", () => {
    const rows = shStrategy.parseList(listHtml, "https://www.i-sh.co.kr/main/x/list.do?multi_itm_seq=2&page=1");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      externalId: "311349",
      title: "은평구 홀몸어르신 은빛주택(수요자맞춤형) 잔여세대 모집 공고",
      postedDate: "2026-10-12",
      detailUrl: "https://www.i-sh.co.kr/main/lay2/program/S1T294C295/www/brd/m_241/view.do?seq=311349&multi_itm_seq=2",
    });
  });

  it("목록 → 필터 → 상세 → 공고 초안", async () => {
    const requested: string[] = [];
    const source = new BoardCrawlerSource(shStrategy, {
      fetchText: async (url) => {
        requested.push(url);
        if (url.includes("list.do")) return url.includes("page=1") && url.includes("multi_itm_seq=2") ? listHtml : shListHtml([]);
        return shDetailHtml;
      },
    });
    const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      title: "은평구 홀몸어르신 은빛주택(수요자맞춤형) 잔여세대 모집 공고",
      organization: "서울주택도시공사",
      regions: [{ sido: "서울", sigungu: "은평구" }],
      applicationStart: "2026-10-26",
      applicationEnd: "2026-11-06",
      announcementDate: "2026-10-12",
      totalHouseholds: 2,
    });
    expect(drafts[0]!.sources[0]).toMatchObject({ source: "sh", externalId: "311349" });
    // 서류안내 글과 오래된 글의 상세 페이지는 요청하지 않는다
    expect(requested.filter((u) => u.includes("view.do"))).toHaveLength(1);
  });

  it("접수기간이 없는 오래된 글은 버리고, 상세 실패는 건너뛴다", async () => {
    const warnings: string[] = [];
    const list = shListHtml([
      { seq: "1", title: "A 임대주택 입주자 모집 공고", date: "2026-06-20" },
      { seq: "2", title: "B 임대주택 입주자 모집 공고", date: "2026-10-10" },
    ]);
    const source = new BoardCrawlerSource(shStrategy, {
      onWarn: (m) => warnings.push(m),
      fetchText: async (url) => {
        if (url.includes("list.do")) return url.includes("page=1") && url.includes("multi_itm_seq=2") ? list : shListHtml([]);
        if (/view\.do\?seq=2&/.test(url)) throw new Error("timeout");
        return "<table><tr><td>등록일 본문 접수기간 안내 없음</td></tr></table>";
      },
    });
    const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
    expect(drafts).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });
});

// ---- iH 실제 마크업 구조 축약
const ihListHtml = `<ul class="bbs_list">
<li><a href="/main/bbs/bbsMsgDetail.do?msg_seq=72&bcd=com_regul" target="_blank">안전보건관리규정</a></li>
<li><p class="title" title="제목"><a href="/main/bbs/bbsMsgDetail.do?msg_seq=4500&cate1=general&bcd=notice&pgdiv=general&pgno=1">2026년 iH 기존주택 매입임대(청년형) 예비입주자 모집 공고</a></p>
<div class="writer_info"><ul><li class="center" title="공지사항">일반임대</li><li class="center" title="작성일">2026.10.06</li><li class="writer" title="작성자">주거복지처</li></ul></div></li>
<li><p class="title" title="제목"><a href="/main/bbs/bbsMsgDetail.do?msg_seq=4446&cate1=general&bcd=notice&pgdiv=general&pgno=1">2026년 4차 우리집(인현, 인현2) 예비자 동호수 추첨결과 발표</a></p>
<div class="writer_info"><ul><li class="center" title="작성일">2026.10.06</li></ul></div></li>
</ul>`;

const ihDetailHtml = `<html><body><script>var x=1;</script><div>공유 링크복사</div>
<div>작성자 인천도시공사(주거복지처) 작성일 2026년 10월 6일(화) 조회수 30
○ 모집공고일 : 2026.10.06. ○ 접수기간 : 2026.10.19.(월) ~ 10.21.(수) 인천도시공사 방문접수 ○ 신청자격 : 공고일 기준 무주택 미혼 청년(만 19~39세) 또는 대학생·취업준비생</div></body></html>`;

describe("iH 크롤러", () => {
  it("목록 파싱: 게시판 글만 추출", () => {
    const rows = ihStrategy.parseList(ihListHtml, "https://www.ih.co.kr/main/bbs/bbsMsgList.do");
    expect(rows.map((r) => r.externalId)).toEqual(["4500", "4446"]);
    expect(rows[0]).toMatchObject({ postedDate: "2026-10-06" });
  });

  it("공고 초안 생성 (공급유형/지역/기간)", async () => {
    const source = new BoardCrawlerSource(ihStrategy, {
      fetchText: async (url) => (url.includes("bbsMsgList") ? (url.includes("pgno=1") ? ihListHtml : "<ul></ul>") : ihDetailHtml),
    });
    const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      supplyType: "youth_purchase_rental",
      regions: [{ sido: "인천", sigungu: null }],
      applicationStart: "2026-10-19",
      applicationEnd: "2026-10-21",
    });
    expect(drafts[0]!.eligibilityText).toContain("무주택 미혼 청년");
  });
});

// ---- GH 실제 마크업 구조(2026-10 관찰)를 축약한 fixture
const ghRow = (no: string, category: string, title: string, date: string) => `
<tr class=""><td class="number">1</td><td class="category"> ${category} </td>
<td class="title"><div class="b-title-box"><a href="?mode=view&amp;articleNo=${no}&amp;article.offset=0&amp;articleLimit=10" title="${title} 자세히 보기"> ${title} </a></div></td>
<td class="department">부서</td><td class="date"> ${date} </td><td class="hit "> 10 </td><td class="attach"></td></tr>`;

const ghListHtml = `<table class="board-list-table"><thead><tr><th>번호</th></tr></thead><tbody>
${ghRow("65267", "산업단지", "평택 포승(BIX)일반산업단지 산업용지 매각 공고", "26.10.08")}
${ghRow("65250", "택지", "경기고양 방송영상밸리 주상복합용지 공급공고", "26.09.30")}
${ghRow("65166", "상가", "다산지금A5 경기행복주택 임대상가 임차인 모집 안내", "26.10.05")}
${ghRow("65301", "주택", "다산 경기행복주택 입주자 모집공고", "26.10.06")}
${ghRow("65152", "주택", "다산 센트럴파크6단지 영구임대주택 예비입주자 발표", "26.10.01")}
${ghRow("65038", "기타", "2026년 기존주택 전세임대 입주자 상시모집 공고", "26.10.02")}
</tbody></table>`;

const ghDetailHtml = `<html><body><script>var a=1;</script><div>메뉴</div>
<div class="sub-page-cont-wrap board-view sale_rental_announcement"><h4>[주택] 다산 경기행복주택 입주자 모집공고</h4>
작성부서 : 주거복지부 작성일 : 26.10.06 조회수 : 12
■ 모집공고일 : 2026.10.06.(화)
■ 접수기간 : 2026.10.19.(월) ~ 2026.10.21.(수)
■ 신청자격 : 무주택 미혼 청년(만 19세~39세)으로서 소득·자산 기준을 충족하는 자</div>
<div>이전글 다음글</div></body></html>`;

describe("GH 크롤러", () => {
  it("날짜(YY.MM.DD)를 정규화한다", () => {
    expect(parseGhDate(" 26.10.08 ")).toBe("2026-10-08");
    expect(parseGhDate("26.1.5")).toBe("2026-01-05");
    expect(parseGhDate("2026-10-08")).toBeNull();
  });

  it("목록 파싱: 산업단지/택지/상가 구분은 제외하고 주택 관련만 추출", () => {
    const rows = ghStrategy.parseList(ghListHtml, "https://www.gh.or.kr/gh/announcement-of-salerental001.do");
    expect(rows.map((r) => r.externalId)).toEqual(["65301", "65152", "65038"]);
    expect(rows[0]).toMatchObject({
      postedDate: "2026-10-06",
      detailUrl: "https://www.gh.or.kr/gh/announcement-of-salerental001.do?mode=view&articleNo=65301",
    });
  });

  it("목록 페이지네이션은 article.offset 으로 이동한다", () => {
    expect(ghStrategy.lists[0]!.url(3)).toContain("article.offset=20");
  });

  it("시군 추정: 지구 별칭, 긴 이름 우선", () => {
    expect(guessGhSigungu("다산 경기행복주택 입주자 모집공고")).toBe("남양주시");
    expect(guessGhSigungu("남양주 매입임대 모집")).toBe("남양주시");
    expect(guessGhSigungu("안양 냉천지구 공공임대 모집")).toBe("안양시");
    expect(guessGhSigungu("전세임대 상시모집")).toBeNull();
  });

  it("공고 초안 생성: 결과 발표 글은 제외, 모집 공고만 수집", async () => {
    const source = new BoardCrawlerSource(ghStrategy, {
      fetchText: async (url) => (url.includes("mode=list") ? (url.includes("offset=0") ? ghListHtml : "<table class='board-list-table'><tbody></tbody></table>") : ghDetailHtml),
    });
    const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
    expect(drafts.map((d) => d.sources[0]!.externalId).sort()).toEqual(["65038", "65301"]);
    const happy = drafts.find((d) => d.sources[0]!.externalId === "65301")!;
    expect(happy).toMatchObject({
      organization: "경기주택도시공사",
      supplyType: "happy_housing",
      regions: [{ sido: "경기", sigungu: "남양주시" }],
      applicationStart: "2026-10-19",
      applicationEnd: "2026-10-21",
    });
    expect(happy.eligibilityText).toContain("무주택 미혼 청년");
  });
});

describe("robots.txt 차단 소스", () => {
  it("목록 요청이 robots 로 막히면 실패가 아니라 건너뜀 오류로 알린다", async () => {
    const source = new BoardCrawlerSource(ghStrategy, {
      fetchText: async (url) => {
        throw new RobotsDisallowedError(url);
      },
    });
    await expect(source.fetchNotices({ fetchedAt: FETCHED_AT })).rejects.toThrow(SourceSkippedError);
  });
});
