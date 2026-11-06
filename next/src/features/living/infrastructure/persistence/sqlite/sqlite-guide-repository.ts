import { and, asc, eq, exists, gt, gte, inArray, isNotNull, isNull, lt, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import type {
  GuideRepository,
  GuideSearchQuery,
  GuideSearchResult,
  UpsertResult,
} from "@/features/living/application/ports/guide-repository";
import type { ProcedureTypeId, SourceId } from "@/features/living/domain/enums";
import type { LivingGuide, GuideSourceRef } from "@/features/living/domain/guide";
import type { Sido } from "@/common/domain/region";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { livingGuides, livingGuideRegions, livingGuideSources, livingGuideTags } from "./schema";

const CHUNK = 500;

function chunk<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class SqliteGuideRepository implements GuideRepository {
  constructor(private readonly db: SqliteDb) {}

  private buildWhere(q: GuideSearchQuery): SQL | undefined {
    const conds: SQL[] = [];

    const statuses = q.statuses && q.statuses.length > 0 ? q.statuses : (["open", "upcoming"] as const);
    const statusConds: SQL[] = [];
    for (const status of statuses) {
      if (status === "open") {
        statusConds.push(
          and(
            or(isNull(livingGuides.applicationStart), lte(livingGuides.applicationStart, q.today)),
            or(isNull(livingGuides.applicationEnd), gte(livingGuides.applicationEnd, q.today)),
          )!,
        );
      } else if (status === "upcoming") {
        statusConds.push(
          and(
            isNotNull(livingGuides.applicationStart),
            gt(livingGuides.applicationStart, q.today),
            or(isNull(livingGuides.applicationEnd), gte(livingGuides.applicationEnd, q.today)),
          )!,
        );
      } else {
        statusConds.push(and(isNotNull(livingGuides.applicationEnd), lt(livingGuides.applicationEnd, q.today))!);
      }
    }
    conds.push(or(...statusConds)!);

    if (q.sidos && q.sidos.length > 0) {
      const regionConds: SQL[] = [inArray(livingGuideRegions.sido, q.sidos)];
      if (q.sigungu) {
        regionConds.push(or(eq(livingGuideRegions.sigungu, q.sigungu), eq(livingGuideRegions.sigungu, ""))!);
      }
      conds.push(
        or(
          exists(
            this.db
              .select({ one: sql`1` })
              .from(livingGuideRegions)
              .where(and(eq(livingGuideRegions.guideId, livingGuides.id), ...regionConds)),
          ),
          notExists(this.db.select({ one: sql`1` }).from(livingGuideRegions).where(eq(livingGuideRegions.guideId, livingGuides.id))),
        )!,
      );
    }

    if (q.procedureTypeIds && q.procedureTypeIds.length > 0) conds.push(inArray(livingGuides.procedureTypeId, q.procedureTypeIds));

    if (q.tags && q.tags.length > 0) {
      conds.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(livingGuideTags)
            .where(and(eq(livingGuideTags.guideId, livingGuides.id), inArray(livingGuideTags.tag, q.tags))),
        )!,
      );
    }

    const keyword = q.keyword?.trim();
    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;
      conds.push(
        or(
          sql`${livingGuides.title} LIKE ${pattern} ESCAPE '\\'`,
          sql`${livingGuides.organization} LIKE ${pattern} ESCAPE '\\'`,
          sql`${livingGuides.summary} LIKE ${pattern} ESCAPE '\\'`,
        )!,
      );
    }

    return and(...conds);
  }

  async search(q: GuideSearchQuery): Promise<GuideSearchResult> {
    const where = this.buildWhere(q);

    const totalRow = this.db.select({ count: sql<number>`count(*)` }).from(livingGuides).where(where).get();
    const total = totalRow?.count ?? 0;

    const orderBy =
      q.sort === "latest"
        ? [
            sql`coalesce(${livingGuides.announcementDate}, ${livingGuides.applicationStart}, substr(${livingGuides.createdAt}, 1, 10)) DESC`,
            asc(livingGuides.id),
          ]
        : [sql`${livingGuides.applicationEnd} IS NULL`, asc(livingGuides.applicationEnd), asc(livingGuides.id)];

    let query = this.db.select({ id: livingGuides.id }).from(livingGuides).where(where).orderBy(...orderBy).$dynamic();
    if (q.limit !== undefined) query = query.limit(q.limit).offset(q.offset ?? 0);
    const ids = query.all().map((r) => r.id);

    return { items: this.hydrate(ids), total };
  }

  async findById(id: string): Promise<LivingGuide | null> {
    return this.hydrate([id])[0] ?? null;
  }

  async findExistingFor(incoming: LivingGuide[]): Promise<LivingGuide[]> {
    const ids = new Set<string>();
    const mergeKeys = [...new Set(incoming.map((n) => n.mergeKey))];
    for (const keys of chunk(mergeKeys)) {
      for (const r of this.db.select({ id: livingGuides.id }).from(livingGuides).where(inArray(livingGuides.mergeKey, keys)).all()) {
        ids.add(r.id);
      }
    }
    for (const n of incoming) {
      for (const s of n.sources) {
        const row = this.db
          .select({ guideId: livingGuideSources.guideId })
          .from(livingGuideSources)
          .where(and(eq(livingGuideSources.source, s.source), eq(livingGuideSources.externalId, s.externalId)))
          .get();
        if (row) ids.add(row.guideId);
      }
    }
    return this.hydrate([...ids]);
  }

  private hydrate(ids: string[]): LivingGuide[] {
    if (ids.length === 0) return [];

    const rowsById = new Map<string, typeof livingGuides.$inferSelect>();
    const regionsBy = new Map<string, Array<{ sido: string; sigungu: string }>>();
    const tagsBy = new Map<string, string[]>();
    const sourcesBy = new Map<string, Array<typeof livingGuideSources.$inferSelect>>();

    for (const part of chunk(ids)) {
      for (const r of this.db.select().from(livingGuides).where(inArray(livingGuides.id, part)).all()) rowsById.set(r.id, r);
      for (const r of this.db.select().from(livingGuideRegions).where(inArray(livingGuideRegions.guideId, part)).all()) {
        (regionsBy.get(r.guideId) ?? regionsBy.set(r.guideId, []).get(r.guideId)!).push(r);
      }
      for (const r of this.db.select().from(livingGuideTags).where(inArray(livingGuideTags.guideId, part)).all()) {
        (tagsBy.get(r.guideId) ?? tagsBy.set(r.guideId, []).get(r.guideId)!).push(r.tag);
      }
      for (const r of this.db.select().from(livingGuideSources).where(inArray(livingGuideSources.guideId, part)).all()) {
        (sourcesBy.get(r.guideId) ?? sourcesBy.set(r.guideId, []).get(r.guideId)!).push(r);
      }
    }

    const result: LivingGuide[] = [];
    for (const id of ids) {
      const r = rowsById.get(id);
      if (!r) continue;
      result.push({
        id: r.id,
        mergeKey: r.mergeKey,
        title: r.title,
        organization: r.organization,
        procedureTypeId: r.procedureTypeId as ProcedureTypeId,
        tags: tagsBy.get(id) ?? [],
        regions: (regionsBy.get(id) ?? []).map((x) => ({ sido: x.sido as Sido, sigungu: x.sigungu || null })),
        applicationStart: r.applicationStart,
        applicationEnd: r.applicationEnd,
        announcementDate: r.announcementDate,
        summary: r.summary,
        checklistSteps: parseChecklistSteps(r.checklistSteps),
        url: r.url,
        sources: (sourcesBy.get(id) ?? []).map(
          (s): GuideSourceRef => ({
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

  async upsertMany(items: LivingGuide[]): Promise<UpsertResult> {
    let inserted = 0;
    let updated = 0;
    const nowIso = new Date().toISOString();

    this.db.transaction((tx) => {
      for (const n of items) {
        const existing = tx.select({ id: livingGuides.id, createdAt: livingGuides.createdAt }).from(livingGuides).where(eq(livingGuides.id, n.id)).get();
        const values = {
          id: n.id,
          mergeKey: n.mergeKey,
          title: n.title,
          organization: n.organization,
          procedureTypeId: n.procedureTypeId,
          applicationStart: n.applicationStart,
          applicationEnd: n.applicationEnd,
          announcementDate: n.announcementDate,
          summary: n.summary,
          checklistSteps: n.checklistSteps.length > 0 ? JSON.stringify(n.checklistSteps) : null,
          url: n.url,
          createdAt: existing?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
        tx.insert(livingGuides).values(values).onConflictDoUpdate({ target: livingGuides.id, set: values }).run();
        if (existing) updated++;
        else inserted++;

        tx.delete(livingGuideRegions).where(eq(livingGuideRegions.guideId, n.id)).run();
        tx.delete(livingGuideTags).where(eq(livingGuideTags.guideId, n.id)).run();
        tx.delete(livingGuideSources).where(eq(livingGuideSources.guideId, n.id)).run();
        for (const s of n.sources) {
          tx.delete(livingGuideSources).where(and(eq(livingGuideSources.source, s.source), eq(livingGuideSources.externalId, s.externalId))).run();
        }

        const regionRows = new Map<string, { guideId: string; sido: string; sigungu: string }>();
        for (const r of n.regions) {
          const row = { guideId: n.id, sido: r.sido, sigungu: r.sigungu ?? "" };
          regionRows.set(`${row.sido}/${row.sigungu}`, row);
        }
        if (regionRows.size > 0) tx.insert(livingGuideRegions).values([...regionRows.values()]).run();

        if (n.tags.length > 0) tx.insert(livingGuideTags).values(n.tags.map((tag) => ({ guideId: n.id, tag }))).run();

        if (n.sources.length > 0) {
          tx.insert(livingGuideSources)
            .values(
              n.sources.map((s) => ({
                source: s.source,
                externalId: s.externalId,
                guideId: n.id,
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

function parseChecklistSteps(raw: string | null): import("@/features/living/domain/guide").ChecklistStep[] {
  if (!raw) return [];
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const o = s as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title : "";
      const summary = typeof o.summary === "string" ? o.summary : "";
      const order = typeof o.order === "number" ? o.order : 0;
      const url = typeof o.url === "string" ? o.url : o.url === null ? null : null;
      if (!title.trim()) return null;
      return { order, title, summary, url };
    })
    .filter((x): x is import("@/features/living/domain/guide").ChecklistStep => x !== null)
    .sort((a, b) => a.order - b.order);
}
