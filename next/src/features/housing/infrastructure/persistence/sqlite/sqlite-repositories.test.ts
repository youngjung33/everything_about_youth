import { beforeEach, describe, expect, it } from "vitest";
import { createNotice } from "@/features/housing/domain/identity";
import type { Complex, NoticeDraft } from "@/features/housing/domain/notice";
import { openSqlite, runMigrations, type SqliteConnection } from "@/common/infrastructure/persistence/sqlite/client";
import { SqliteUserStore } from "@/common/infrastructure/persistence/sqlite/sqlite-user-store";
import { SqliteNoticeRepository } from "./sqlite-notice-repository";
import { SqliteSavedNoticeRepository } from "./sqlite-saved-notice-repository";
import { SqliteSyncRunRepository } from "./sqlite-sync-run-repository";

const TODAY = "2026-10-12";

const complex = (over: Partial<Complex> = {}): Complex => ({
  name: "테스트단지",
  address: "서울특별시 강남구 어딘가",
  region: { sido: "서울", sigungu: "강남구" },
  housingType: "apartment",
  households: 100,
  units: [{ name: "26A", exclusiveAreaM2: 26.5, households: 10, deposit: 50_000_000, monthlyRent: 150_000 }],
  ...over,
});

let seq = 0;
const make = (over: Partial<NoticeDraft> = {}) => {
  seq++;
  return createNotice({
    title: `공고 ${seq}`,
    organization: "LH",
    supplyType: "happy_housing",
    housingTypes: ["apartment"],
    regions: [{ sido: "서울", sigungu: "강남구" }],
    applicationStart: "2026-10-01",
    applicationEnd: "2026-10-20",
    announcementDate: "2026-09-28",
    winnerAnnouncementDate: null,
    totalHouseholds: 100,
    eligibilityText: null,
    url: `https://example.com/${seq}`,
    complexes: [complex()],
    sources: [{ source: "lh", externalId: `ext-${seq}`, url: null, raw: { a: 1 }, fetchedAt: "2026-10-12T00:00:00Z" }],
    ...over,
  });
};

describe("SqliteNoticeRepository", () => {
  let conn: SqliteConnection;
  let repo: SqliteNoticeRepository;

  beforeEach(() => {
    seq = 0;
    conn = openSqlite(":memory:");
    runMigrations(conn.db);
    repo = new SqliteNoticeRepository(conn.db);
  });

  it("저장 후 그대로 복원된다", async () => {
    const n = make();
    const r = await repo.upsertMany([n]);
    expect(r).toEqual({ inserted: 1, updated: 0 });
    const loaded = await repo.findById(n.id);
    expect(loaded).toMatchObject({
      id: n.id,
      title: n.title,
      supplyType: "happy_housing",
      housingTypes: ["apartment"],
      regions: [{ sido: "서울", sigungu: "강남구" }],
    });
    expect(loaded!.complexes[0]!.units[0]).toMatchObject({ name: "26A", deposit: 50_000_000 });
    expect(loaded!.sources[0]).toMatchObject({ source: "lh", externalId: "ext-1", raw: { a: 1 } });
  });

  it("같은 id 를 다시 저장하면 갱신하고 자식 데이터를 교체한다", async () => {
    const n = make();
    await repo.upsertMany([n]);
    const r = await repo.upsertMany([{ ...n, title: "변경", complexes: [] }]);
    expect(r).toEqual({ inserted: 0, updated: 1 });
    const loaded = await repo.findById(n.id);
    expect(loaded!.title).toBe("변경");
    expect(loaded!.complexes).toHaveLength(0);
  });

  it("기본 검색은 접수중+접수예정만, 마감 임박순", async () => {
    await repo.upsertMany([
      make({ title: "마감", applicationStart: "2026-09-01", applicationEnd: "2026-09-30" }),
      make({ title: "예정", applicationStart: "2026-11-01", applicationEnd: "2026-11-10" }),
      make({ title: "접수중-늦음", applicationEnd: "2026-10-30" }),
      make({ title: "접수중-빠름", applicationEnd: "2026-10-15" }),
      make({ title: "상시", applicationStart: null, applicationEnd: null }),
    ]);
    const { items, total } = await repo.search({ today: TODAY, sort: "deadline" });
    expect(total).toBe(4);
    expect(items.map((i) => i.title)).toEqual(["접수중-빠름", "접수중-늦음", "예정", "상시"]);

    const closed = await repo.search({ today: TODAY, sort: "deadline", statuses: ["closed"] });
    expect(closed.items.map((i) => i.title)).toEqual(["마감"]);
  });

  it("지역/공급유형/주택유형/금액/면적/키워드 조합 필터", async () => {
    await repo.upsertMany([
      make({ title: "서울 행복 아파트" }),
      make({
        title: "부산 국민 오피스텔",
        supplyType: "national_rental",
        housingTypes: ["officetel"],
        regions: [{ sido: "부산", sigungu: "해운대구" }],
        complexes: [
          complex({
            name: "해운대단지",
            region: { sido: "부산", sigungu: "해운대구" },
            housingType: "officetel",
            units: [{ name: "40", exclusiveAreaM2: 40, households: 5, deposit: 120_000_000, monthlyRent: 300_000 }],
          }),
        ],
      }),
      make({ title: "경기 가격미상", regions: [{ sido: "경기", sigungu: null }], complexes: [] }),
    ]);

    const q = (extra: object) => repo.search({ today: TODAY, sort: "deadline", ...extra });

    expect((await q({ sidos: ["서울"] })).items.map((i) => i.title)).toEqual(["서울 행복 아파트"]);
    expect((await q({ sidos: ["서울", "부산"] })).total).toBe(2);
    expect((await q({ sidos: ["서울"], sigungu: "송파구" })).total).toBe(0);
    expect((await q({ sidos: ["경기"], sigungu: "수원시" })).total).toBe(1); // 시군구 미상은 포함
    expect((await q({ supplyTypes: ["national_rental"] })).items[0]!.title).toBe("부산 국민 오피스텔");
    expect((await q({ housingTypes: ["officetel"] })).total).toBe(1);
    // 보증금 1억 이하: 서울(5천만) + 가격미상(경기) 포함, 부산(1.2억) 제외
    expect((await q({ maxDeposit: 100_000_000 })).items.map((i) => i.title).sort()).toEqual(["경기 가격미상", "서울 행복 아파트"]);
    expect((await q({ maxMonthlyRent: 200_000 })).total).toBe(2);
    // 면적 35~50㎡: 부산(40) + 면적 미상 경기
    expect((await q({ minAreaM2: 35, maxAreaM2: 50 })).items.map((i) => i.title).sort()).toEqual(["경기 가격미상", "부산 국민 오피스텔"]);
    expect((await q({ keyword: "해운대" })).items.map((i) => i.title)).toEqual(["부산 국민 오피스텔"]);
    expect((await q({ keyword: "100%" })).total).toBe(0); // LIKE 와일드카드 이스케이프
  });

  it("페이징", async () => {
    await repo.upsertMany(Array.from({ length: 5 }, (_, i) => make({ applicationEnd: `2026-10-${20 + i}` })));
    const p1 = await repo.search({ today: TODAY, sort: "deadline", limit: 2, offset: 0 });
    const p3 = await repo.search({ today: TODAY, sort: "deadline", limit: 2, offset: 4 });
    expect(p1.total).toBe(5);
    expect(p1.items).toHaveLength(2);
    expect(p3.items).toHaveLength(1);
  });

  it("findExistingFor 는 병합키 또는 소스 외부ID로 찾는다", async () => {
    const n = make();
    await repo.upsertMany([n]);
    const byKey = await repo.findExistingFor([{ ...make(), mergeKey: n.mergeKey, sources: [] }]);
    expect(byKey.map((x) => x.id)).toEqual([n.id]);
    const bySource = await repo.findExistingFor([{ ...make(), mergeKey: "zzz", sources: n.sources }]);
    expect(bySource.map((x) => x.id)).toEqual([n.id]);
    expect(await repo.findExistingFor([{ ...make(), mergeKey: "none" }])).toEqual([]);
  });
});

describe("SqliteSyncRunRepository", () => {
  it("실행 이력을 기록하고 소스별 최신을 조회한다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const runs = new SqliteSyncRunRepository(conn.db);
    const id1 = await runs.start("lh", "2026-10-12T00:00:00Z");
    await runs.finish(id1, { status: "failed", finishedAt: "2026-10-12T00:00:01Z", fetchedCount: 0, insertedCount: 0, updatedCount: 0, error: "x" });
    const id2 = await runs.start("lh", "2026-10-12T01:00:00Z");
    await runs.finish(id2, { status: "success", finishedAt: "2026-10-12T01:00:05Z", fetchedCount: 3, insertedCount: 2, updatedCount: 1 });
    await runs.start("sh", "2026-10-12T01:10:00Z");

    const latest = await runs.latestPerSource();
    expect(latest.map((r) => [r.source, r.status])).toEqual([
      ["sh", "running"],
      ["lh", "success"],
    ]);
    expect((await runs.listRecent(10)).length).toBe(3);
    expect(await runs.lastSuccessAt()).toBe("2026-10-12T01:00:05Z");
  });

  it("성공한 수집이 없으면 lastSuccessAt 은 null", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const runs = new SqliteSyncRunRepository(conn.db);
    expect(await runs.lastSuccessAt()).toBeNull();
    const id = await runs.start("lh", "2026-10-12T00:00:00Z");
    await runs.finish(id, { status: "failed", finishedAt: "2026-10-12T00:00:01Z", fetchedCount: 0, insertedCount: 0, updatedCount: 0, error: "x" });
    expect(await runs.lastSuccessAt()).toBeNull();
  });
});

describe("SqliteSavedNoticeRepository", () => {
  it("회원별로 저장하고 최근 순으로 조회하며, 공고·회원 삭제 때 같이 지워진다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const notices = new SqliteNoticeRepository(conn.db);
    const saved = new SqliteSavedNoticeRepository(conn.db);
    const users = new SqliteUserStore(conn.db);
    const userId = await users.findOrCreate("google", "g1", "2026-10-12T00:00:00Z", () => "u1");
    const a = make({ title: "A" });
    const b = make({ title: "B" });
    await notices.upsertMany([a, b]);

    await saved.save(userId, a.id, "2026-10-12T01:00:00Z");
    await saved.save(userId, b.id, "2026-10-12T02:00:00Z");
    await saved.save(userId, a.id, "2026-10-12T03:00:00Z"); // 이미 있으면 시각 유지
    expect(await saved.count(userId)).toBe(2);
    expect(await saved.isSaved(userId, a.id)).toBe(true);
    expect((await saved.list(userId)).map((r) => r.noticeId)).toEqual([b.id, a.id]);
    expect((await saved.list(userId))[1]!.savedAt).toBe("2026-10-12T01:00:00Z");

    await saved.remove(userId, a.id);
    expect(await saved.isSaved(userId, a.id)).toBe(false);
    expect(await saved.count(userId)).toBe(1);

    await notices.upsertMany([{ ...b, title: "B2", complexes: [] }]); // 공고는 남고
    expect(await saved.isSaved(userId, b.id)).toBe(true);
    await conn.raw.prepare("delete from notices where id = ?").run(b.id);
    expect(await saved.count(userId)).toBe(0);

    const other = await users.findOrCreate("kakao", "k1", "t", () => "u2");
    const c = make({ title: "C" });
    await notices.upsertMany([c]);
    await saved.save(other, c.id, "2026-10-12T04:00:00Z");
    await users.delete(other);
    expect(await saved.count(other)).toBe(0);
  });
});
