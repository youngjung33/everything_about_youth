import { and, asc, eq, exists, gt, gte, inArray, isNotNull, isNull, lt, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import type {
  JobPostingRepository,
  PostingSearchQuery,
  PostingSearchResult,
  UpsertResult,
} from "@/features/jobs/application/ports/posting-repository";
import type { HireTypeId, SourceId } from "@/features/jobs/domain/enums";
import type { JobPosting, JobPostingSourceRef } from "@/features/jobs/domain/job-posting";
import type { Sido } from "@/common/domain/region";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { jobPostings, jobPostingRegions, jobPostingSources, jobPostingTags } from "./schema";

const CHUNK = 500;

function chunk<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class SqliteJobPostingRepository implements JobPostingRepository {
  constructor(private readonly db: SqliteDb) {}

  private buildWhere(q: PostingSearchQuery): SQL | undefined {
    const conds: SQL[] = [];

    const statuses = q.statuses && q.statuses.length > 0 ? q.statuses : (["open", "upcoming"] as const);
    const statusConds: SQL[] = [];
    for (const status of statuses) {
      if (status === "open") {
        statusConds.push(
          and(
            or(isNull(jobPostings.applicationStart), lte(jobPostings.applicationStart, q.today)),
            or(isNull(jobPostings.applicationEnd), gte(jobPostings.applicationEnd, q.today)),
          )!,
        );
      } else if (status === "upcoming") {
        statusConds.push(
          and(
            isNotNull(jobPostings.applicationStart),
            gt(jobPostings.applicationStart, q.today),
            or(isNull(jobPostings.applicationEnd), gte(jobPostings.applicationEnd, q.today)),
          )!,
        );
      } else {
        statusConds.push(and(isNotNull(jobPostings.applicationEnd), lt(jobPostings.applicationEnd, q.today))!);
      }
    }
    conds.push(or(...statusConds)!);

    if (q.sidos && q.sidos.length > 0) {
      const regionConds: SQL[] = [inArray(jobPostingRegions.sido, q.sidos)];
      if (q.sigungu) {
        regionConds.push(or(eq(jobPostingRegions.sigungu, q.sigungu), eq(jobPostingRegions.sigungu, ""))!);
      }
      conds.push(
        or(
          exists(
            this.db
              .select({ one: sql`1` })
              .from(jobPostingRegions)
              .where(and(eq(jobPostingRegions.postingId, jobPostings.id), ...regionConds)),
          ),
          notExists(this.db.select({ one: sql`1` }).from(jobPostingRegions).where(eq(jobPostingRegions.postingId, jobPostings.id))),
        )!,
      );
    }

    if (q.hireTypeIds && q.hireTypeIds.length > 0) conds.push(inArray(jobPostings.hireTypeId, q.hireTypeIds));

    if (q.tags && q.tags.length > 0) {
      conds.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(jobPostingTags)
            .where(and(eq(jobPostingTags.postingId, jobPostings.id), inArray(jobPostingTags.tag, q.tags))),
        )!,
      );
    }

    const keyword = q.keyword?.trim();
    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;
      conds.push(
        or(
          sql`${jobPostings.title} LIKE ${pattern} ESCAPE '\\'`,
          sql`${jobPostings.organization} LIKE ${pattern} ESCAPE '\\'`,
          sql`${jobPostings.summary} LIKE ${pattern} ESCAPE '\\'`,
        )!,
      );
    }

    return and(...conds);
  }

  async search(q: PostingSearchQuery): Promise<PostingSearchResult> {
    const where = this.buildWhere(q);

    const totalRow = this.db.select({ count: sql<number>`count(*)` }).from(jobPostings).where(where).get();
    const total = totalRow?.count ?? 0;

    const orderBy =
      q.sort === "latest"
        ? [
            sql`coalesce(${jobPostings.announcementDate}, ${jobPostings.applicationStart}, substr(${jobPostings.createdAt}, 1, 10)) DESC`,
            asc(jobPostings.id),
          ]
        : [sql`${jobPostings.applicationEnd} IS NULL`, asc(jobPostings.applicationEnd), asc(jobPostings.id)];

    let query = this.db.select({ id: jobPostings.id }).from(jobPostings).where(where).orderBy(...orderBy).$dynamic();
    if (q.limit !== undefined) query = query.limit(q.limit).offset(q.offset ?? 0);
    const ids = query.all().map((r) => r.id);

    return { items: this.hydrate(ids), total };
  }

  async findById(id: string): Promise<JobPosting | null> {
    return this.hydrate([id])[0] ?? null;
  }

  async findExistingFor(incoming: JobPosting[]): Promise<JobPosting[]> {
    const ids = new Set<string>();
    const mergeKeys = [...new Set(incoming.map((n) => n.mergeKey))];
    for (const keys of chunk(mergeKeys)) {
      for (const r of this.db.select({ id: jobPostings.id }).from(jobPostings).where(inArray(jobPostings.mergeKey, keys)).all()) {
        ids.add(r.id);
      }
    }
    for (const n of incoming) {
      for (const s of n.sources) {
        const row = this.db
          .select({ postingId: jobPostingSources.postingId })
          .from(jobPostingSources)
          .where(and(eq(jobPostingSources.source, s.source), eq(jobPostingSources.externalId, s.externalId)))
          .get();
        if (row) ids.add(row.postingId);
      }
    }
    return this.hydrate([...ids]);
  }

  private hydrate(ids: string[]): JobPosting[] {
    if (ids.length === 0) return [];

    const rowsById = new Map<string, typeof jobPostings.$inferSelect>();
    const regionsBy = new Map<string, Array<{ sido: string; sigungu: string }>>();
    const tagsBy = new Map<string, string[]>();
    const sourcesBy = new Map<string, Array<typeof jobPostingSources.$inferSelect>>();

    for (const part of chunk(ids)) {
      for (const r of this.db.select().from(jobPostings).where(inArray(jobPostings.id, part)).all()) rowsById.set(r.id, r);
      for (const r of this.db.select().from(jobPostingRegions).where(inArray(jobPostingRegions.postingId, part)).all()) {
        (regionsBy.get(r.postingId) ?? regionsBy.set(r.postingId, []).get(r.postingId)!).push(r);
      }
      for (const r of this.db.select().from(jobPostingTags).where(inArray(jobPostingTags.postingId, part)).all()) {
        (tagsBy.get(r.postingId) ?? tagsBy.set(r.postingId, []).get(r.postingId)!).push(r.tag);
      }
      for (const r of this.db.select().from(jobPostingSources).where(inArray(jobPostingSources.postingId, part)).all()) {
        (sourcesBy.get(r.postingId) ?? sourcesBy.set(r.postingId, []).get(r.postingId)!).push(r);
      }
    }

    const result: JobPosting[] = [];
    for (const id of ids) {
      const r = rowsById.get(id);
      if (!r) continue;
      result.push({
        id: r.id,
        mergeKey: r.mergeKey,
        title: r.title,
        organization: r.organization,
        hireTypeId: r.hireTypeId as HireTypeId,
        tags: tagsBy.get(id) ?? [],
        regions: (regionsBy.get(id) ?? []).map((x) => ({ sido: x.sido as Sido, sigungu: x.sigungu || null })),
        applicationStart: r.applicationStart,
        applicationEnd: r.applicationEnd,
        announcementDate: r.announcementDate,
        summary: r.summary,
        url: r.url,
        sources: (sourcesBy.get(id) ?? []).map(
          (s): JobPostingSourceRef => ({
            source: s.source as SourceId,
            externalId: s.externalId,
            url: s.url,
            raw: s.rawPayload ? safeParse(s.rawPayload) : null,
            fetchedAt: s.fetchedAt,
          }),
        ),
      });
    }
    return result;
  }

  async upsertMany(items: JobPosting[]): Promise<UpsertResult> {
    let inserted = 0;
    let updated = 0;
    const nowIso = new Date().toISOString();

    this.db.transaction((tx) => {
      for (const n of items) {
        const existing = tx.select({ id: jobPostings.id, createdAt: jobPostings.createdAt }).from(jobPostings).where(eq(jobPostings.id, n.id)).get();
        const values = {
          id: n.id,
          mergeKey: n.mergeKey,
          title: n.title,
          organization: n.organization,
          hireTypeId: n.hireTypeId,
          applicationStart: n.applicationStart,
          applicationEnd: n.applicationEnd,
          announcementDate: n.announcementDate,
          summary: n.summary,
          url: n.url,
          createdAt: existing?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
        tx.insert(jobPostings).values(values).onConflictDoUpdate({ target: jobPostings.id, set: values }).run();
        if (existing) updated++;
        else inserted++;

        tx.delete(jobPostingRegions).where(eq(jobPostingRegions.postingId, n.id)).run();
        tx.delete(jobPostingTags).where(eq(jobPostingTags.postingId, n.id)).run();
        tx.delete(jobPostingSources).where(eq(jobPostingSources.postingId, n.id)).run();
        for (const s of n.sources) {
          tx.delete(jobPostingSources).where(and(eq(jobPostingSources.source, s.source), eq(jobPostingSources.externalId, s.externalId))).run();
        }

        const regionRows = new Map<string, { postingId: string; sido: string; sigungu: string }>();
        for (const r of n.regions) {
          const row = { postingId: n.id, sido: r.sido, sigungu: r.sigungu ?? "" };
          regionRows.set(`${row.sido}/${row.sigungu}`, row);
        }
        if (regionRows.size > 0) tx.insert(jobPostingRegions).values([...regionRows.values()]).run();

        if (n.tags.length > 0) tx.insert(jobPostingTags).values(n.tags.map((tag) => ({ postingId: n.id, tag }))).run();

        if (n.sources.length > 0) {
          tx.insert(jobPostingSources)
            .values(
              n.sources.map((s) => ({
                source: s.source,
                externalId: s.externalId,
                postingId: n.id,
                url: s.url,
                rawPayload: s.raw === undefined || s.raw === null ? null : JSON.stringify(s.raw),
                fetchedAt: s.fetchedAt,
              })),
            )
            .run();
        }
      }
    });

    return { inserted, updated };
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
