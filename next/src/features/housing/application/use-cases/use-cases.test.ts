import { describe, expect, it } from "vitest";
import type { NoticeDraft, Notice } from "@/features/housing/domain/notice";
import { createNotice, isSameNotice } from "@/features/housing/domain/identity";
import type { NoticeRepository, NoticeSearchQuery } from "../ports/notice-repository";
import { SourceSkippedError, type NoticeSourcePort } from "../ports/notice-source";
import type { SyncRun, SyncRunFinish, SyncRunRepository } from "../ports/sync-run-repository";
import { silentLogger, type Clock } from "@/common/application/system";
import { SearchNotices } from "./search-notices";
import { SyncNoticesFromSource, dedupeBatch } from "./sync-notices-from-source";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<NoticeDraft> = {}): NoticeDraft => ({
  title: "행복주택 모집",
  organization: "LH",
  supplyType: "happy_housing",
  housingTypes: ["apartment"],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  winnerAnnouncementDate: null,
  totalHouseholds: null,
  eligibilityText: null,
  url: null,
  complexes: [],
  sources: [{ source: "lh", externalId: "1", url: null, raw: {}, fetchedAt: "" }],
  ...over,
});

class FakeRepo implements NoticeRepository {
  store = new Map<string, Notice>();
  lastQuery: NoticeSearchQuery | null = null;
  async search(query: NoticeSearchQuery) {
    this.lastQuery = query;
    const all = [...this.store.values()];
    const items = query.limit !== undefined ? all.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit) : all;
    return { items, total: all.length };
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findExistingFor(incoming: Notice[]) {
    return [...this.store.values()].filter((e) => incoming.some((i) => isSameNotice(e, i)));
  }
  async upsertMany(notices: Notice[]) {
    let inserted = 0;
    let updated = 0;
    for (const n of notices) {
      if (this.store.has(n.id)) updated++;
      else inserted++;
      this.store.set(n.id, n);
    }
    return { inserted, updated };
  }
}

class FakeRuns implements SyncRunRepository {
  runs: SyncRun[] = [];
  async start(source: SyncRun["source"], startedAt: string) {
    const id = this.runs.length + 1;
    this.runs.push({ id, source, status: "running", startedAt, finishedAt: null, fetchedCount: 0, insertedCount: 0, updatedCount: 0, error: null });
    return id;
  }
  async finish(id: number, r: SyncRunFinish) {
    const run = this.runs.find((x) => x.id === id)!;
    Object.assign(run, { status: r.status, finishedAt: r.finishedAt, fetchedCount: r.fetchedCount, insertedCount: r.insertedCount, updatedCount: r.updatedCount, error: r.error ?? null });
  }
  async listRecent() {
    return this.runs;
  }
  async latestPerSource() {
    return this.runs;
  }
  async lastSuccessAt() {
    const done = this.runs.filter((r) => r.status === "success" && r.finishedAt).map((r) => r.finishedAt!);
    return done.length > 0 ? done.sort().at(-1)! : null;
  }
}

const source = (id: "lh" | "sh", drafts: NoticeDraft[] | Error, available = true): NoticeSourcePort => ({
  id,
  label: id,
  checkAvailability: () => (available ? { available: true } : { available: false, reason: "키 없음" }),
  fetchNotices: async () => {
    if (drafts instanceof Error) throw drafts;
    return drafts;
  },
});

describe("dedupeBatch", () => {
  it("같은 공고는 mergeNotice 로 합친다", () => {
    const a = createNotice(draft());
    const b = createNotice(draft({ title: "[정정] 행복주택 모집" }));
    const out = dedupeBatch([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]!.sources.length).toBeGreaterThanOrEqual(1);
  });
});

describe("SyncNoticesFromSource", () => {
  it("수집/저장하고 실행 이력을 남긴다", async () => {
    const repo = new FakeRepo();
    const runs = new FakeRuns();
    const uc = new SyncNoticesFromSource([source("lh", [draft(), draft({ title: "다른 공고", sources: [{ source: "lh", externalId: "2", url: null, raw: {}, fetchedAt: "" }] })])], repo, runs, clock, silentLogger);
    const [r] = await uc.execute();
    expect(r).toMatchObject({ status: "success", fetched: 2, inserted: 2, updated: 0 });
    expect(repo.store.size).toBe(2);
    expect(runs.runs[0]).toMatchObject({ status: "success", insertedCount: 2 });
  });

  it("재수집하면 중복 없이 갱신한다", async () => {
    const repo = new FakeRepo();
    const uc = new SyncNoticesFromSource([source("lh", [draft()])], repo, new FakeRuns(), clock, silentLogger);
    await uc.execute();
    const [r] = await uc.execute();
    expect(r).toMatchObject({ inserted: 0, updated: 1 });
    expect(repo.store.size).toBe(1);
  });

  it("다른 소스의 같은 공고는 병합되어 소스가 합쳐진다", async () => {
    const repo = new FakeRepo();
    const other = draft({ organization: "한국토지주택공사", sources: [{ source: "sh", externalId: "x", url: null, raw: {}, fetchedAt: "" }] });
    const uc = new SyncNoticesFromSource([source("lh", [draft()]), source("sh", [other])], repo, new FakeRuns(), clock, silentLogger);
    await uc.execute();
    expect(repo.store.size).toBe(1);
    expect([...repo.store.values()][0]!.sources).toHaveLength(2);
  });

  it("한 소스가 실패해도 나머지는 진행하고, 사용 불가 소스는 건너뛴다", async () => {
    const repo = new FakeRepo();
    const runs = new FakeRuns();
    const uc = new SyncNoticesFromSource(
      [source("lh", new Error("boom")), source("sh", [draft()], true)],
      repo,
      runs,
      clock,
      silentLogger,
    );
    const results = await uc.execute();
    expect(results.map((r) => r.status)).toEqual(["failed", "success"]);

    const skipped = await new SyncNoticesFromSource([source("lh", [], false)], repo, runs, clock, silentLogger).execute();
    expect(skipped[0]).toMatchObject({ status: "skipped", error: "키 없음" });
  });

  it("소스가 SourceSkippedError 를 던지면 실패가 아니라 건너뜀으로 기록한다", async () => {
    const runs = new FakeRuns();
    const uc = new SyncNoticesFromSource([source("sh", new SourceSkippedError("robots.txt 금지"))], new FakeRepo(), runs, clock, silentLogger);
    const [r] = await uc.execute();
    expect(r).toMatchObject({ status: "skipped", error: "robots.txt 금지" });
    expect(runs.runs[0]).toMatchObject({ status: "skipped" });
  });

  it("fetch 가 문자열을 던져도 failed 로 기록한다", async () => {
    const runs = new FakeRuns();
    const throwing: NoticeSourcePort = {
      id: "lh",
      label: "lh",
      checkAvailability: () => ({ available: true }),
      fetchNotices: async () => {
        throw "network down";
      },
    };
    const [r] = await new SyncNoticesFromSource([throwing], new FakeRepo(), runs, clock, silentLogger).execute();
    expect(r).toMatchObject({ status: "failed", error: "network down" });
  });

  it("sourceIds 로 대상 소스만 실행한다", async () => {
    const repo = new FakeRepo();
    const uc = new SyncNoticesFromSource(
      [source("lh", [draft()]), source("sh", [draft({ title: "SH" })])],
      repo,
      new FakeRuns(),
      clock,
      silentLogger,
    );
    const results = await uc.execute(["sh"]);
    expect(results).toHaveLength(1);
    expect(results[0]!.source).toBe("sh");
    expect(repo.store.size).toBe(1);
  });

  it("빈 수집도 success 로 끝난다", async () => {
    const [r] = await new SyncNoticesFromSource([source("lh", [])], new FakeRepo(), new FakeRuns(), clock, silentLogger).execute();
    expect(r).toMatchObject({ status: "success", fetched: 0, inserted: 0, updated: 0 });
  });
});

describe("SearchNotices", () => {
  it("오늘(KST)을 주입해 repo 에 위임하고 상태/자격을 붙인다", async () => {
    const repo = new FakeRepo();
    await repo.upsertMany([createNotice(draft())]);
    const uc = new SearchNotices(repo, clock);
    const out = await uc.execute({
      filters: {},
      profile: { age: 30, isHomeless: true, householdSize: 1, monthlyIncomeWon: 3_000_000, totalAssetWon: 50_000_000, carValueWon: 0 },
    });
    expect(repo.lastQuery?.today).toBe("2026-10-12");
    expect(out.items[0]).toMatchObject({ status: "open" });
    expect(out.items[0]!.eligibility?.verdict).toBe("eligible");
  });

  it("자격 필터가 있으면 판정 결과로 걸러내고 메모리에서 페이징한다", async () => {
    const repo = new FakeRepo();
    await repo.upsertMany([
      createNotice(draft({ title: "A 행복주택" })),
      createNotice(draft({ title: "B 국민임대", supplyType: "national_rental" })),
    ]);
    const uc = new SearchNotices(repo, clock);
    const out = await uc.execute({
      filters: {},
      // 3인 가구 월 650만원: 행복주택(100%, 월 816만원 이하)은 가능, 국민임대(70%, 월 571만원 이하)는 초과
      profile: {
        age: 30,
        isHomeless: true,
        householdSize: 3,
        monthlyIncomeWon: 6_500_000,
        totalAssetWon: 50_000_000,
        carValueWon: 0,
      },
      verdicts: ["eligible"],
    });
    // 국민임대는 소득 초과로 불가, 행복주택만 남는다
    expect(out.total).toBe(1);
    expect(out.items[0]!.notice.title).toBe("A 행복주택");
    expect(repo.lastQuery?.limit).toBeUndefined();
  });

  it("page·pageSize 경계를 보정한다", async () => {
    const repo = new FakeRepo();
    await repo.upsertMany([createNotice(draft())]);
    const uc = new SearchNotices(repo, clock);
    const out = await uc.execute({ filters: {}, page: 0, pageSize: 999 });
    expect(out.page).toBe(1);
    expect(out.pageSize).toBe(100);
  });

  it("verdicts 가 있어도 profile 이 없으면 SQL 페이징 경로", async () => {
    const repo = new FakeRepo();
    await repo.upsertMany([createNotice(draft())]);
    const uc = new SearchNotices(repo, clock);
    const out = await uc.execute({ filters: {}, verdicts: ["eligible"] });
    expect(out.items).toHaveLength(1);
    expect(repo.lastQuery?.limit).toBe(20);
  });

  it("profile 없으면 eligibility 는 null", async () => {
    const repo = new FakeRepo();
    await repo.upsertMany([createNotice(draft())]);
    const out = await new SearchNotices(repo, clock).execute({ filters: {} });
    expect(out.items[0]!.eligibility).toBeNull();
  });
});
