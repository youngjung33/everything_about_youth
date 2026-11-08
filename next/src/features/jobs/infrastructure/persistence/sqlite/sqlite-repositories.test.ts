import { beforeEach, describe, expect, it } from "vitest";
import { createJobPosting } from "@/features/jobs/domain/identity";
import type { JobPostingDraft } from "@/features/jobs/domain/job-posting";
import { openSqlite, runMigrations, type SqliteConnection } from "@/common/infrastructure/persistence/sqlite/client";
import { SqliteUserStore } from "@/common/infrastructure/persistence/sqlite/sqlite-user-store";
import { SqliteJobPostingRepository } from "./sqlite-posting-repository";
import { SqliteSavedJobPostingRepository } from "./sqlite-saved-posting-repository";
import { SqliteSyncRunRepository } from "./sqlite-sync-run-repository";

const TODAY = "2026-10-12";

let seq = 0;
const make = (over: Partial<JobPostingDraft> = {}) => {
  seq++;
  return createJobPosting({
    title: `정책 ${seq}`,
    organization: "서울시",
    hireTypeId: "public_corp",
    tags: ["월세"],
    regions: [{ sido: "서울", sigungu: "마포구" }],
    applicationStart: "2026-10-01",
    applicationEnd: "2026-10-20",
    announcementDate: null,
    summary: "요약",
    url: `https://example.com/${seq}`,
    sources: [{ source: "demo", externalId: `ext-${seq}`, url: null, raw: { a: 1 }, fetchedAt: "2026-10-12T00:00:00Z" }],
    ...over,
  });
};

describe("SqliteJobPostingRepository", () => {
  let conn: SqliteConnection;
  let repo: SqliteJobPostingRepository;

  beforeEach(() => {
    seq = 0;
    conn = openSqlite(":memory:");
    runMigrations(conn.db);
    repo = new SqliteJobPostingRepository(conn.db);
  });

  it("저장 후 복원", async () => {
    const p = make();
    const r = await repo.upsertMany([p]);
    expect(r).toEqual({ inserted: 1, updated: 0 });
    const loaded = await repo.findById(p.id);
    expect(loaded?.tags).toEqual(["월세"]);
    expect(loaded?.sources[0]).toMatchObject({ source: "demo", raw: { a: 1 } });
  });

  it("키워드 검색", async () => {
    await repo.upsertMany([make({ title: "월세 지원" }), make({ title: "창업 패키지", tags: ["창업"] })]);
    const { items, total } = await repo.search({ today: TODAY, keyword: "월세", sort: "deadline" });
    expect(total).toBe(1);
    expect(items[0]!.title).toContain("월세");
  });
});

describe("SqliteSavedJobPostingRepository", () => {
  it("저장·목록", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const schemes = new SqliteJobPostingRepository(conn.db);
    const saved = new SqliteSavedJobPostingRepository(conn.db);
    const users = new SqliteUserStore(conn.db);
    const userId = await users.findOrCreate("google", "g-benefits", "2026-01-01T00:00:00Z", () => "u-benefits");
    const p = make();
    await schemes.upsertMany([p]);
    await saved.save(userId, p.id, "2026-01-02T00:00:00Z");
    expect(await saved.isSaved(userId, p.id)).toBe(true);
    expect(await saved.list(userId)).toEqual([{ postingId: p.id, savedAt: "2026-01-02T00:00:00Z" }]);
    conn.close();
  });
});

describe("SqliteSyncRunRepository", () => {
  it("start/finish", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const runs = new SqliteSyncRunRepository(conn.db);
    const id = await runs.start("curated", "2026-01-01T00:00:00Z");
    await runs.finish(id, {
      status: "success",
      finishedAt: "2026-01-01T00:01:00Z",
      fetchedCount: 3,
      insertedCount: 2,
      updatedCount: 1,
    });
    expect(await runs.lastSuccessAt()).toBe("2026-01-01T00:01:00Z");
    conn.close();
  });
});
