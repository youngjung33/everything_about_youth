import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { SearchNotices } from "@/features/housing/application/use-cases/search-notices";
import type { NoticeRepository, NoticeSearchQuery } from "@/features/housing/application/ports/notice-repository";
import { createNotice } from "@/features/housing/domain/identity";
import type { Notice, NoticeDraft } from "@/features/housing/domain/notice";
import { GetNoticeDetail } from "@/features/housing/application/use-cases/get-notice-detail";
import { ManageSavedNotices, MAX_SAVED_NOTICES } from "@/features/housing/application/use-cases/manage-saved-notices";
import type { SavedNotice, SavedNoticeRepository } from "@/features/housing/application/ports/saved-notice-repository";
import {
  handleGetMeta,
  handleGetNotice,
  handleListNotices,
  handleListSaved,
  handleListSavedIds,
  handleMergeSaved,
  handleNoticeCalendar,
  handleSaveNotice,
  handleUnsaveNotice,
  toRawSearchParams,
  type HousingApiDeps,
} from "./handlers";
import type { NoticeDetailDto, NoticeListDto } from "./dto";
import { regionLabel } from "../region-label";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") }; // KST 2026-10-12

const draft = (over: Partial<NoticeDraft> = {}): NoticeDraft => ({
  title: "서울 행복주택 모집",
  organization: "LH",
  supplyType: "happy_housing",
  housingTypes: ["apartment"],
  regions: [{ sido: "서울", sigungu: "강남구" }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-15",
  announcementDate: "2026-09-28",
  winnerAnnouncementDate: "2026-11-01",
  totalHouseholds: 15,
  eligibilityText: "문의: 1600-1004",
  url: "https://example.com/n1",
  complexes: [
    {
      name: "가단지",
      address: "서울 강남구 1",
      region: { sido: "서울", sigungu: "강남구" },
      housingType: "apartment",
      households: 15,
      units: [
        { name: "16A", exclusiveAreaM2: 16.5, households: 10, deposit: 15_000_000, monthlyRent: 120_000 },
        { name: "26B", exclusiveAreaM2: 26.5, households: 5, deposit: 25_000_000, monthlyRent: 180_000 },
      ],
    },
  ],
  sources: [{ source: "lh", externalId: "1", url: "https://example.com/lh/1", raw: { secret: "x" }, fetchedAt: "2026-10-11T00:00:00.000Z" }],
  ...over,
});

class MemorySaved implements SavedNoticeRepository {
  rows: SavedNotice[] = [];
  async list() {
    return [...this.rows].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }
  async isSaved(_userId: string, noticeId: string) {
    return this.rows.some((r) => r.noticeId === noticeId);
  }
  async count() {
    return this.rows.length;
  }
  async save(_userId: string, noticeId: string, savedAt: string) {
    if (!this.rows.some((r) => r.noticeId === noticeId)) this.rows.push({ noticeId, savedAt });
  }
  async remove(_userId: string, noticeId: string) {
    this.rows = this.rows.filter((r) => r.noticeId !== noticeId);
  }
}

class FakeRepo implements NoticeRepository {
  constructor(private readonly store: Notice[]) {}
  lastQuery: NoticeSearchQuery | null = null;
  async search(query: NoticeSearchQuery) {
    this.lastQuery = query;
    const items = query.limit !== undefined ? this.store.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit) : this.store;
    return { items, total: this.store.length };
  }
  async findById(id: string) {
    return this.store.find((n) => n.id === id) ?? null;
  }
  async findExistingFor() {
    return [];
  }
  async upsertMany() {
    return { inserted: 0, updated: 0 };
  }
}

function setup(drafts: NoticeDraft[]) {
  const notices = drafts.map(createNotice);
  const repo = new FakeRepo(notices);
  const deps: HousingApiDeps = {
    searchNotices: new SearchNotices(repo, clock),
    getNoticeDetail: new GetNoticeDetail(repo, clock),
    manageSavedNotices: new ManageSavedNotices(new MemorySaved(), repo, clock),
    syncRuns: { lastSuccessAt: async () => "2026-10-12T01:00:00.000Z" },
    clock,
  };
  return { deps, notices, repo };
}

const qs = (s: string) => new URLSearchParams(s);

describe("공고 목록 API", () => {
  it("요약 DTO: 라벨·D-day·금액/면적 요약을 내려준다", async () => {
    const { deps } = setup([draft()]);
    const { status, body } = await handleListNotices(qs(""), deps);
    const list = body as NoticeListDto;
    expect(status).toBe(200);
    expect(list).toMatchObject({ total: 1, page: 1, pageSize: 20, totalPages: 1, today: "2026-10-12" });
    expect(list.items[0]).toMatchObject({
      title: "서울 행복주택 모집",
      supplyType: "happy_housing",
      supplyTypeLabel: "행복주택",
      housingTypeLabels: ["아파트"],
      status: "open",
      statusLabel: "접수중",
      dday: "D-3",
      regionLabel: "서울 강남구",
      totalHouseholds: 15,
      minDeposit: 15_000_000,
      minMonthlyRent: 120_000,
      minAreaM2: 16.5,
      maxAreaM2: 26.5,
      sourceLabels: ["LH 분양임대공고"],
      eligibility: null,
    });
  });

  it("원본 응답(raw)은 노출하지 않는다", async () => {
    const { deps } = setup([draft()]);
    const text = JSON.stringify((await handleListNotices(qs(""), deps)).body);
    expect(text).not.toContain("secret");
    expect(text).not.toContain("raw");
  });

  it("웹과 같은 필터 파라미터를 해석한다 (반복 키, 만원 단위)", async () => {
    const { deps, repo } = setup([draft()]);
    await handleListNotices(qs("sido=서울&sido=경기&supply=happy_housing&status=open&maxDeposit=5000&q=행복&sort=latest&page=2"), deps);
    expect(repo.lastQuery).toMatchObject({
      sidos: ["서울", "경기"],
      supplyTypes: ["happy_housing"],
      statuses: ["open"],
      maxDeposit: 50_000_000,
      keyword: "행복",
      sort: "latest",
      offset: 20,
    });
  });

  it("pageSize 는 1~50 으로 제한한다", async () => {
    const { deps, repo } = setup([draft()]);
    await handleListNotices(qs("pageSize=500"), deps);
    expect(repo.lastQuery!.limit).toBe(50);
    await handleListNotices(qs("pageSize=abc"), deps);
    expect(repo.lastQuery!.limit).toBe(20);
    await handleListNotices(qs("pageSize=5"), deps);
    expect(repo.lastQuery!.limit).toBe(5);
  });

  it("'내 조건'을 주면 자격 판정을 포함하고, v 로 판정 결과를 거를 수 있다", async () => {
    const { deps } = setup([draft(), draft({ title: "다른 공고", applicationEnd: "2026-10-01", sources: [{ source: "lh", externalId: "2", url: null, raw: {}, fetchedAt: "" }] })]);
    const mine = "age=29&home=y&household=1&monthly=300&asset=5000&car=0";
    const all = (await handleListNotices(qs(`${mine}&sort=deadline`), deps)).body as NoticeListDto;
    expect(all.items.every((i) => i.eligibility !== null)).toBe(true);
    const eligible = (await handleListNotices(qs(`${mine}&v=eligible`), deps)).body as NoticeListDto;
    expect(eligible.items.map((i) => i.title)).toEqual(["서울 행복주택 모집"]);
    expect(eligible.items[0]!.eligibility).toMatchObject({ verdict: "eligible", verdictLabel: "신청 가능" });
    expect(eligible.total).toBe(1);
  });

  it("내 조건이 없으면 v 는 무시한다", async () => {
    const { deps } = setup([draft()]);
    const list = (await handleListNotices(qs("v=eligible"), deps)).body as NoticeListDto;
    expect(list.total).toBe(1);
    expect(list.items[0]!.eligibility).toBeNull();
  });
});

describe("공고 상세 API", () => {
  it("단지·세대유형·출처를 포함하되 raw 는 제외한다", async () => {
    const { deps, notices } = setup([draft()]);
    const { status, body } = await handleGetNotice(notices[0]!.id, qs(""), deps);
    const detail = body as NoticeDetailDto;
    expect(status).toBe(200);
    expect(detail).toMatchObject({
      winnerAnnouncementDate: "2026-11-01",
      eligibilityText: "문의: 1600-1004",
      eligibility: null,
    });
    expect(detail.complexes[0]).toMatchObject({ name: "가단지", housingTypeLabel: "아파트", region: { sido: "서울", sigungu: "강남구" } });
    expect(detail.complexes[0]!.units[1]).toEqual({ name: "26B", exclusiveAreaM2: 26.5, households: 5, deposit: 25_000_000, monthlyRent: 180_000 });
    expect(detail.sources[0]).toEqual({
      source: "lh",
      sourceLabel: "LH 분양임대공고",
      externalId: "1",
      url: "https://example.com/lh/1",
      fetchedAt: "2026-10-11T00:00:00.000Z",
    });
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(detail.googleCalendarUrl).toContain("calendar.google.com");
    expect(detail.googleCalendarUrl).toContain("20261015");
  });

  it("내 조건을 주면 판정 사유와 안내를 준다", async () => {
    const { deps, notices } = setup([draft()]);
    // 행복주택은 청년·신혼·대학생 중 하나여야 하므로 셋 다 아니라고 명시하면 불가
    const detail = (await handleGetNotice(notices[0]!.id, qs("age=45&home=y&newlywed=n&student=n"), deps)).body as NoticeDetailDto;
    expect(detail.eligibility!.verdict).toBe("ineligible");
    expect(detail.eligibility!.reasons.length).toBeGreaterThan(0);
    expect(detail.eligibility!.notes.length).toBeGreaterThan(0);
    // 일부만 모르면 불가가 아니라 확인 필요
    const unsure = (await handleGetNotice(notices[0]!.id, qs("age=45&home=y"), deps)).body as NoticeDetailDto;
    expect(unsure.eligibility!.verdict).toBe("check");
  });

  it("소득·자산을 주면 금액 기준으로 판정하고 사유에 기준 금액을 보여준다", async () => {
    const { deps, notices } = setup([draft()]);
    const base = "age=29&home=y&household=1&car=0&asset=5000";
    const ok = (await handleGetNotice(notices[0]!.id, qs(`${base}&monthly=457`), deps)).body as NoticeDetailDto;
    expect(ok.eligibility!.verdict).toBe("eligible");
    const over = (await handleGetNotice(notices[0]!.id, qs(`${base}&monthly=458`), deps)).body as NoticeDetailDto;
    expect(over.eligibility!.verdict).toBe("ineligible");
    expect(over.eligibility!.reasons.join(" ")).toContain("4,576,036원");
    // 자산을 빼면 확인 필요 + 필요한 입력을 알려준다
    const noAsset = (await handleGetNotice(notices[0]!.id, qs("age=29&home=y&household=1&monthly=300"), deps)).body as NoticeDetailDto;
    expect(noAsset.eligibility!.verdict).toBe("check");
    expect(noAsset.eligibility!.reasons.join(" ")).toContain("총자산 입력 필요");
  });

  it("없는 공고는 NOTICE_NOT_FOUND(404)", async () => {
    const { deps } = setup([draft()]);
    await expect(handleGetNotice("nope", qs(""), deps)).rejects.toMatchObject({
      code: "NOTICE_NOT_FOUND",
      message: "공고를 찾을 수 없습니다.",
    });
  });
});

describe("메타 API", () => {
  it("필터 선택지와 라벨을 내려준다", async () => {
    const { deps } = setup([]);
    const meta = (await handleGetMeta(deps)).body;
    expect(meta.supplyTypes).toContainEqual({ value: "public_rental", label: "공공임대(10·50년)" });
    expect(meta.supplyTypes).toContainEqual({ value: "happy_housing", label: "행복주택" });
    expect(meta.verdicts).toEqual([
      { value: "eligible", label: "신청 가능" },
      { value: "check", label: "조건 확인 필요" },
      { value: "ineligible", label: "신청 불가" },
    ]);
    expect(meta.sidos).toContain("서울");
    expect(meta.sidos).toHaveLength(17);
  });

  it("자격 판정 기준표(연도, 가구원수별 소득)와 마지막 수집 시각을 내려준다", async () => {
    const { standards, dataUpdatedAt } = (await handleGetMeta(setup([]).deps)).body;
    expect(standards.year).toBe(2026);
    expect(standards.maxHouseholdSize).toBe(8);
    expect(standards.urbanWorkerIncome).toHaveLength(8);
    expect(standards.urbanWorkerIncome[2]).toBe(8_168_429);
    expect(standards.medianIncome[0]).toBe(2_564_238);
    expect(dataUpdatedAt).toBe("2026-10-12T01:00:00.000Z");
  });
});

describe("regionLabel", () => {
  it("같은 시도에 시군구가 있으면 시도만 있는 항목은 생략한다", () => {
    expect(regionLabel([])).toBe("지역 미상");
    expect(regionLabel([{ sido: "서울", sigungu: null }])).toBe("서울");
    expect(
      regionLabel([
        { sido: "대전", sigungu: null },
        { sido: "대전", sigungu: "서구" },
        { sido: "충남", sigungu: null },
      ]),
    ).toBe("대전 서구, 충남");
    expect(
      regionLabel(["a", "b", "c", "d", "e"].map((g) => ({ sido: "경기", sigungu: g }))),
    ).toBe("경기 a, 경기 b, 경기 c 외 2곳");
  });
});

describe("관심 공고 API", () => {
  it("저장하고 목록·id 를 조회하고 빼면 비운다", async () => {
    const { deps, notices } = setup([draft()]);
    const id = notices[0]!.id;
    expect(await handleSaveNotice("u1", id, deps)).toEqual({ status: 200, body: { saved: true } });
    expect((await handleListSavedIds("u1", deps)).body.ids).toEqual([id]);
    const list = (await handleListSaved("u1", qs(""), deps)).body;
    expect(list.total).toBe(1);
    expect(list.items[0]!.id).toBe(id);
    expect(await handleUnsaveNotice("u1", id, deps)).toEqual({ status: 200, body: { saved: false } });
    expect((await handleListSavedIds("u1", deps)).body.ids).toEqual([]);
  });

  it("없는 공고는 NOTICE_NOT_FOUND, 합치기는 존재하는 id 만 남긴다", async () => {
    const { deps, notices } = setup([draft()]);
    await expect(handleSaveNotice("u1", "nope", deps)).rejects.toMatchObject({ code: "NOTICE_NOT_FOUND" });
    const merged = (await handleMergeSaved("u1", { ids: [notices[0]!.id, "nope"] }, deps)).body;
    expect(merged.ids).toEqual([notices[0]!.id]);
  });

  it("상한에 도달하면 BAD_REQUEST", async () => {
    const notices = Array.from({ length: MAX_SAVED_NOTICES + 1 }, (_, i) =>
      createNotice(draft({ title: `n${i}`, sources: [{ source: "lh", externalId: `e${i}`, url: null, raw: {}, fetchedAt: "" }] })),
    );
    const { deps } = setup(notices);
    for (let i = 0; i < MAX_SAVED_NOTICES; i++) {
      await handleSaveNotice("u1", notices[i]!.id, deps);
    }
    await expect(handleSaveNotice("u1", notices[MAX_SAVED_NOTICES]!.id, deps)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("이미 저장된 공고를 다시 저장해도 200 (already)", async () => {
    const { deps, notices } = setup([draft()]);
    const id = notices[0]!.id;
    await handleSaveNotice("u1", id, deps);
    await expect(handleSaveNotice("u1", id, deps)).resolves.toEqual({ status: 200, body: { saved: true } });
  });
});

describe("캘린더 ICS", () => {
  it("접수 마감일이 있으면 ICS 파일을 내려준다", async () => {
    const { deps, notices } = setup([draft()]);
    const res = await handleNoticeCalendar(notices[0]!.id, deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("DTSTART;VALUE=DATE:20261015");
  });

  it("없는 공고는 NOTICE_NOT_FOUND", async () => {
    const { deps } = setup([draft()]);
    await expect(handleNoticeCalendar("nope", deps)).rejects.toMatchObject({ code: "NOTICE_NOT_FOUND" });
  });

  it("접수 마감일이 없으면 BAD_REQUEST", async () => {
    const { deps, notices } = setup([draft({ applicationEnd: null })]);
    await expect(handleNoticeCalendar(notices[0]!.id, deps)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "접수 마감일이 없어 캘린더에 넣을 수 없습니다.",
    });
  });
});

describe("toRawSearchParams", () => {
  it("반복 키는 배열, 단일 키는 문자열", () => {
    expect(toRawSearchParams(qs("a=1&b=2&b=3"))).toEqual({ a: "1", b: ["2", "3"] });
  });
});
