import { and, asc, eq, exists, gt, gte, inArray, isNotNull, isNull, lt, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import type {
  SchemeRepository,
  SchemeSearchQuery,
  SchemeSearchResult,
  UpsertResult,
} from "@/features/finance/application/ports/scheme-repository";
import type { ProductTypeId, SourceId } from "@/features/finance/domain/enums";
import type { FinanceScheme, SchemeSourceRef } from "@/features/finance/domain/scheme";
import type { Sido } from "@/common/domain/region";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { financeSchemes, financeSchemeRegions, financeSchemeSources, financeSchemeTags } from "./schema";

const CHUNK = 500;

function chunk<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class SqliteSchemeRepository implements SchemeRepository {
  constructor(private readonly db: SqliteDb) {}

  private buildWhere(q: SchemeSearchQuery): SQL | undefined {
    const conds: SQL[] = [];

    const statuses = q.statuses && q.statuses.length > 0 ? q.statuses : (["open", "upcoming"] as const);
    const statusConds: SQL[] = [];
    for (const status of statuses) {
      if (status === "open") {
        statusConds.push(
          and(
            or(isNull(financeSchemes.applicationStart), lte(financeSchemes.applicationStart, q.today)),
            or(isNull(financeSchemes.applicationEnd), gte(financeSchemes.applicationEnd, q.today)),
          )!,
        );
      } else if (status === "upcoming") {
        statusConds.push(
          and(
            isNotNull(financeSchemes.applicationStart),
            gt(financeSchemes.applicationStart, q.today),
            or(isNull(financeSchemes.applicationEnd), gte(financeSchemes.applicationEnd, q.today)),
          )!,
        );
      } else {
        statusConds.push(and(isNotNull(financeSchemes.applicationEnd), lt(financeSchemes.applicationEnd, q.today))!);
      }
    }
    conds.push(or(...statusConds)!);

    if (q.sidos && q.sidos.length > 0) {
      const regionConds: SQL[] = [inArray(financeSchemeRegions.sido, q.sidos)];
      if (q.sigungu) {
        regionConds.push(or(eq(financeSchemeRegions.sigungu, q.sigungu), eq(financeSchemeRegions.sigungu, ""))!);
      }
      conds.push(
        or(
          exists(
            this.db
              .select({ one: sql`1` })
              .from(financeSchemeRegions)
              .where(and(eq(financeSchemeRegions.schemeId, financeSchemes.id), ...regionConds)),
          ),
          notExists(this.db.select({ one: sql`1` }).from(financeSchemeRegions).where(eq(financeSchemeRegions.schemeId, financeSchemes.id))),
        )!,
      );
    }

    if (q.productTypeIds && q.productTypeIds.length > 0) conds.push(inArray(financeSchemes.productTypeId, q.productTypeIds));

    if (q.tags && q.tags.length > 0) {
      conds.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(financeSchemeTags)
            .where(and(eq(financeSchemeTags.schemeId, financeSchemes.id), inArray(financeSchemeTags.tag, q.tags))),
        )!,
      );
    }

    const keyword = q.keyword?.trim();
    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;
      conds.push(
        or(
          sql`${financeSchemes.title} LIKE ${pattern} ESCAPE '\\'`,
          sql`${financeSchemes.organization} LIKE ${pattern} ESCAPE '\\'`,
          sql`${financeSchemes.summary} LIKE ${pattern} ESCAPE '\\'`,
        )!,
      );
    }

    return and(...conds);
  }

  async search(q: SchemeSearchQuery): Promise<SchemeSearchResult> {
    const where = this.buildWhere(q);

    const totalRow = this.db.select({ count: sql<number>`count(*)` }).from(financeSchemes).where(where).get();
    const total = totalRow?.count ?? 0;

    const orderBy =
      q.sort === "latest"
        ? [
            sql`coalesce(${financeSchemes.announcementDate}, ${financeSchemes.applicationStart}, substr(${financeSchemes.createdAt}, 1, 10)) DESC`,
            asc(financeSchemes.id),
          ]
        : [sql`${financeSchemes.applicationEnd} IS NULL`, asc(financeSchemes.applicationEnd), asc(financeSchemes.id)];

    let query = this.db.select({ id: financeSchemes.id }).from(financeSchemes).where(where).orderBy(...orderBy).$dynamic();
    if (q.limit !== undefined) query = query.limit(q.limit).offset(q.offset ?? 0);
    const ids = query.all().map((r) => r.id);

    return { items: this.hydrate(ids), total };
  }

  async findById(id: string): Promise<FinanceScheme | null> {
    return this.hydrate([id])[0] ?? null;
  }

  async findExistingFor(incoming: FinanceScheme[]): Promise<FinanceScheme[]> {
    const ids = new Set<string>();
    const mergeKeys = [...new Set(incoming.map((n) => n.mergeKey))];
    for (const keys of chunk(mergeKeys)) {
      for (const r of this.db.select({ id: financeSchemes.id }).from(financeSchemes).where(inArray(financeSchemes.mergeKey, keys)).all()) {
        ids.add(r.id);
      }
    }
    for (const n of incoming) {
      for (const s of n.sources) {
        const row = this.db
          .select({ schemeId: financeSchemeSources.schemeId })
          .from(financeSchemeSources)
          .where(and(eq(financeSchemeSources.source, s.source), eq(financeSchemeSources.externalId, s.externalId)))
          .get();
        if (row) ids.add(row.schemeId);
      }
    }
    return this.hydrate([...ids]);
  }

  private hydrate(ids: string[]): FinanceScheme[] {
    if (ids.length === 0) return [];

    const rowsById = new Map<string, typeof financeSchemes.$inferSelect>();
    const regionsBy = new Map<string, Array<{ sido: string; sigungu: string }>>();
    const tagsBy = new Map<string, string[]>();
    const sourcesBy = new Map<string, Array<typeof financeSchemeSources.$inferSelect>>();

    for (const part of chunk(ids)) {
      for (const r of this.db.select().from(financeSchemes).where(inArray(financeSchemes.id, part)).all()) rowsById.set(r.id, r);
      for (const r of this.db.select().from(financeSchemeRegions).where(inArray(financeSchemeRegions.schemeId, part)).all()) {
        (regionsBy.get(r.schemeId) ?? regionsBy.set(r.schemeId, []).get(r.schemeId)!).push(r);
      }
      for (const r of this.db.select().from(financeSchemeTags).where(inArray(financeSchemeTags.schemeId, part)).all()) {
        (tagsBy.get(r.schemeId) ?? tagsBy.set(r.schemeId, []).get(r.schemeId)!).push(r.tag);
      }
      for (const r of this.db.select().from(financeSchemeSources).where(inArray(financeSchemeSources.schemeId, part)).all()) {
        (sourcesBy.get(r.schemeId) ?? sourcesBy.set(r.schemeId, []).get(r.schemeId)!).push(r);
      }
    }

    const result: FinanceScheme[] = [];
    for (const id of ids) {
      const r = rowsById.get(id);
      if (!r) continue;
      result.push({
        id: r.id,
        mergeKey: r.mergeKey,
        title: r.title,
        organization: r.organization,
        productTypeId: r.productTypeId as ProductTypeId,
        tags: tagsBy.get(id) ?? [],
        regions: (regionsBy.get(id) ?? []).map((x) => ({ sido: x.sido as Sido, sigungu: x.sigungu || null })),
        applicationStart: r.applicationStart,
        applicationEnd: r.applicationEnd,
        announcementDate: r.announcementDate,
        summary: r.summary,
        url: r.url,
        sources: (sourcesBy.get(id) ?? []).map(
          (s): SchemeSourceRef => ({
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

  async upsertMany(items: FinanceScheme[]): Promise<UpsertResult> {
    let inserted = 0;
    let updated = 0;
    const nowIso = new Date().toISOString();

    this.db.transaction((tx) => {
      for (const n of items) {
        const existing = tx.select({ id: financeSchemes.id, createdAt: financeSchemes.createdAt }).from(financeSchemes).where(eq(financeSchemes.id, n.id)).get();
        const values = {
          id: n.id,
          mergeKey: n.mergeKey,
          title: n.title,
          organization: n.organization,
          productTypeId: n.productTypeId,
          applicationStart: n.applicationStart,
          applicationEnd: n.applicationEnd,
          announcementDate: n.announcementDate,
          summary: n.summary,
          url: n.url,
          createdAt: existing?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
        tx.insert(financeSchemes).values(values).onConflictDoUpdate({ target: financeSchemes.id, set: values }).run();
        if (existing) updated++;
        else inserted++;

        tx.delete(financeSchemeRegions).where(eq(financeSchemeRegions.schemeId, n.id)).run();
        tx.delete(financeSchemeTags).where(eq(financeSchemeTags.schemeId, n.id)).run();
        tx.delete(financeSchemeSources).where(eq(financeSchemeSources.schemeId, n.id)).run();
        for (const s of n.sources) {
          tx.delete(financeSchemeSources).where(and(eq(financeSchemeSources.source, s.source), eq(financeSchemeSources.externalId, s.externalId))).run();
        }

        const regionRows = new Map<string, { schemeId: string; sido: string; sigungu: string }>();
        for (const r of n.regions) {
          const row = { schemeId: n.id, sido: r.sido, sigungu: r.sigungu ?? "" };
          regionRows.set(`${row.sido}/${row.sigungu}`, row);
        }
        if (regionRows.size > 0) tx.insert(financeSchemeRegions).values([...regionRows.values()]).run();

        if (n.tags.length > 0) tx.insert(financeSchemeTags).values(n.tags.map((tag) => ({ schemeId: n.id, tag }))).run();

        if (n.sources.length > 0) {
          tx.insert(financeSchemeSources)
            .values(
              n.sources.map((s) => ({
                source: s.source,
                externalId: s.externalId,
                schemeId: n.id,
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
