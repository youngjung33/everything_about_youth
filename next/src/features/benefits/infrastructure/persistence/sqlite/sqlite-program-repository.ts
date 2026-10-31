import { and, asc, eq, exists, gt, gte, inArray, isNotNull, isNull, lt, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import type {
  ProgramRepository,
  ProgramSearchQuery,
  ProgramSearchResult,
  UpsertResult,
} from "@/features/benefits/application/ports/program-repository";
import type { CategoryId, SourceId } from "@/features/benefits/domain/enums";
import type { BenefitProgram, ProgramSourceRef } from "@/features/benefits/domain/program";
import type { Sido } from "@/common/domain/region";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { benefitPrograms, programRegions, programSources, programTags } from "./schema";

const CHUNK = 500;

function chunk<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class SqliteProgramRepository implements ProgramRepository {
  constructor(private readonly db: SqliteDb) {}

  private buildWhere(q: ProgramSearchQuery): SQL | undefined {
    const conds: SQL[] = [];

    const statuses = q.statuses && q.statuses.length > 0 ? q.statuses : (["open", "upcoming"] as const);
    const statusConds: SQL[] = [];
    for (const status of statuses) {
      if (status === "open") {
        statusConds.push(
          and(
            or(isNull(benefitPrograms.applicationStart), lte(benefitPrograms.applicationStart, q.today)),
            or(isNull(benefitPrograms.applicationEnd), gte(benefitPrograms.applicationEnd, q.today)),
          )!,
        );
      } else if (status === "upcoming") {
        statusConds.push(
          and(
            isNotNull(benefitPrograms.applicationStart),
            gt(benefitPrograms.applicationStart, q.today),
            or(isNull(benefitPrograms.applicationEnd), gte(benefitPrograms.applicationEnd, q.today)),
          )!,
        );
      } else {
        statusConds.push(and(isNotNull(benefitPrograms.applicationEnd), lt(benefitPrograms.applicationEnd, q.today))!);
      }
    }
    conds.push(or(...statusConds)!);

    if (q.sidos && q.sidos.length > 0) {
      const regionConds: SQL[] = [inArray(programRegions.sido, q.sidos)];
      if (q.sigungu) {
        regionConds.push(or(eq(programRegions.sigungu, q.sigungu), eq(programRegions.sigungu, ""))!);
      }
      conds.push(
        or(
          exists(
            this.db
              .select({ one: sql`1` })
              .from(programRegions)
              .where(and(eq(programRegions.programId, benefitPrograms.id), ...regionConds)),
          ),
          notExists(this.db.select({ one: sql`1` }).from(programRegions).where(eq(programRegions.programId, benefitPrograms.id))),
        )!,
      );
    }

    if (q.categoryIds && q.categoryIds.length > 0) conds.push(inArray(benefitPrograms.categoryId, q.categoryIds));

    if (q.tags && q.tags.length > 0) {
      conds.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(programTags)
            .where(and(eq(programTags.programId, benefitPrograms.id), inArray(programTags.tag, q.tags))),
        )!,
      );
    }

    const keyword = q.keyword?.trim();
    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;
      conds.push(
        or(
          sql`${benefitPrograms.title} LIKE ${pattern} ESCAPE '\\'`,
          sql`${benefitPrograms.organization} LIKE ${pattern} ESCAPE '\\'`,
          sql`${benefitPrograms.summary} LIKE ${pattern} ESCAPE '\\'`,
        )!,
      );
    }

    return and(...conds);
  }

  async search(q: ProgramSearchQuery): Promise<ProgramSearchResult> {
    const where = this.buildWhere(q);

    const totalRow = this.db.select({ count: sql<number>`count(*)` }).from(benefitPrograms).where(where).get();
    const total = totalRow?.count ?? 0;

    const orderBy =
      q.sort === "latest"
        ? [
            sql`coalesce(${benefitPrograms.announcementDate}, ${benefitPrograms.applicationStart}, substr(${benefitPrograms.createdAt}, 1, 10)) DESC`,
            asc(benefitPrograms.id),
          ]
        : [sql`${benefitPrograms.applicationEnd} IS NULL`, asc(benefitPrograms.applicationEnd), asc(benefitPrograms.id)];

    let query = this.db.select({ id: benefitPrograms.id }).from(benefitPrograms).where(where).orderBy(...orderBy).$dynamic();
    if (q.limit !== undefined) query = query.limit(q.limit).offset(q.offset ?? 0);
    const ids = query.all().map((r) => r.id);

    return { items: this.hydrate(ids), total };
  }

  async findById(id: string): Promise<BenefitProgram | null> {
    return this.hydrate([id])[0] ?? null;
  }

  async findExistingFor(incoming: BenefitProgram[]): Promise<BenefitProgram[]> {
    const ids = new Set<string>();
    const mergeKeys = [...new Set(incoming.map((n) => n.mergeKey))];
    for (const keys of chunk(mergeKeys)) {
      for (const r of this.db.select({ id: benefitPrograms.id }).from(benefitPrograms).where(inArray(benefitPrograms.mergeKey, keys)).all()) {
        ids.add(r.id);
      }
    }
    for (const n of incoming) {
      for (const s of n.sources) {
        const row = this.db
          .select({ programId: programSources.programId })
          .from(programSources)
          .where(and(eq(programSources.source, s.source), eq(programSources.externalId, s.externalId)))
          .get();
        if (row) ids.add(row.programId);
      }
    }
    return this.hydrate([...ids]);
  }

  private hydrate(ids: string[]): BenefitProgram[] {
    if (ids.length === 0) return [];

    const rowsById = new Map<string, typeof benefitPrograms.$inferSelect>();
    const regionsBy = new Map<string, Array<{ sido: string; sigungu: string }>>();
    const tagsBy = new Map<string, string[]>();
    const sourcesBy = new Map<string, Array<typeof programSources.$inferSelect>>();

    for (const part of chunk(ids)) {
      for (const r of this.db.select().from(benefitPrograms).where(inArray(benefitPrograms.id, part)).all()) rowsById.set(r.id, r);
      for (const r of this.db.select().from(programRegions).where(inArray(programRegions.programId, part)).all()) {
        (regionsBy.get(r.programId) ?? regionsBy.set(r.programId, []).get(r.programId)!).push(r);
      }
      for (const r of this.db.select().from(programTags).where(inArray(programTags.programId, part)).all()) {
        (tagsBy.get(r.programId) ?? tagsBy.set(r.programId, []).get(r.programId)!).push(r.tag);
      }
      for (const r of this.db.select().from(programSources).where(inArray(programSources.programId, part)).all()) {
        (sourcesBy.get(r.programId) ?? sourcesBy.set(r.programId, []).get(r.programId)!).push(r);
      }
    }

    const result: BenefitProgram[] = [];
    for (const id of ids) {
      const r = rowsById.get(id);
      if (!r) continue;
      result.push({
        id: r.id,
        mergeKey: r.mergeKey,
        title: r.title,
        organization: r.organization,
        categoryId: r.categoryId as CategoryId,
        tags: tagsBy.get(id) ?? [],
        regions: (regionsBy.get(id) ?? []).map((x) => ({ sido: x.sido as Sido, sigungu: x.sigungu || null })),
        applicationStart: r.applicationStart,
        applicationEnd: r.applicationEnd,
        announcementDate: r.announcementDate,
        summary: r.summary,
        url: r.url,
        sources: (sourcesBy.get(id) ?? []).map(
          (s): ProgramSourceRef => ({
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

  async upsertMany(items: BenefitProgram[]): Promise<UpsertResult> {
    let inserted = 0;
    let updated = 0;
    const nowIso = new Date().toISOString();

    this.db.transaction((tx) => {
      for (const n of items) {
        const existing = tx.select({ id: benefitPrograms.id, createdAt: benefitPrograms.createdAt }).from(benefitPrograms).where(eq(benefitPrograms.id, n.id)).get();
        const values = {
          id: n.id,
          mergeKey: n.mergeKey,
          title: n.title,
          organization: n.organization,
          categoryId: n.categoryId,
          applicationStart: n.applicationStart,
          applicationEnd: n.applicationEnd,
          announcementDate: n.announcementDate,
          summary: n.summary,
          url: n.url,
          createdAt: existing?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
        tx.insert(benefitPrograms).values(values).onConflictDoUpdate({ target: benefitPrograms.id, set: values }).run();
        if (existing) updated++;
        else inserted++;

        tx.delete(programRegions).where(eq(programRegions.programId, n.id)).run();
        tx.delete(programTags).where(eq(programTags.programId, n.id)).run();
        tx.delete(programSources).where(eq(programSources.programId, n.id)).run();
        for (const s of n.sources) {
          tx.delete(programSources).where(and(eq(programSources.source, s.source), eq(programSources.externalId, s.externalId))).run();
        }

        const regionRows = new Map<string, { programId: string; sido: string; sigungu: string }>();
        for (const r of n.regions) {
          const row = { programId: n.id, sido: r.sido, sigungu: r.sigungu ?? "" };
          regionRows.set(`${row.sido}/${row.sigungu}`, row);
        }
        if (regionRows.size > 0) tx.insert(programRegions).values([...regionRows.values()]).run();

        if (n.tags.length > 0) tx.insert(programTags).values(n.tags.map((tag) => ({ programId: n.id, tag }))).run();

        if (n.sources.length > 0) {
          tx.insert(programSources)
            .values(
              n.sources.map((s) => ({
                source: s.source,
                externalId: s.externalId,
                programId: n.id,
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
