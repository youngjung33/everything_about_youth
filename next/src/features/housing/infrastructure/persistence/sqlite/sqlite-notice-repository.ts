import { and, asc, eq, exists, gt, gte, inArray, isNotNull, isNull, lt, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import type {
  NoticeRepository,
  NoticeSearchQuery,
  NoticeSearchResult,
  UpsertResult,
} from "@/features/housing/application/ports/notice-repository";
import type { HousingType, SourceId, SupplyType } from "@/features/housing/domain/enums";
import { summarizeUnits, type Complex, type Notice, type NoticeSourceRef } from "@/features/housing/domain/notice";
import type { Sido } from "@/common/domain/region";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { complexes, noticeHousingTypes, noticeRegions, noticeSources, notices, unitTypes } from "./schema";

const CHUNK = 500;

function chunk<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class SqliteNoticeRepository implements NoticeRepository {
  constructor(private readonly db: SqliteDb) {}

  // ---------------------------------------------------------------- search

  private buildWhere(q: NoticeSearchQuery): SQL | undefined {
    const conds: SQL[] = [];

    const statuses = q.statuses && q.statuses.length > 0 ? q.statuses : (["open", "upcoming"] as const);
    const statusConds: SQL[] = [];
    for (const status of statuses) {
      if (status === "open") {
        statusConds.push(
          and(
            or(isNull(notices.applicationStart), lte(notices.applicationStart, q.today)),
            or(isNull(notices.applicationEnd), gte(notices.applicationEnd, q.today)),
          )!,
        );
      } else if (status === "upcoming") {
        statusConds.push(
          and(
            isNotNull(notices.applicationStart),
            gt(notices.applicationStart, q.today),
            or(isNull(notices.applicationEnd), gte(notices.applicationEnd, q.today)),
          )!,
        );
      } else {
        statusConds.push(and(isNotNull(notices.applicationEnd), lt(notices.applicationEnd, q.today))!);
      }
    }
    conds.push(or(...statusConds)!);

    if (q.sidos && q.sidos.length > 0) {
      const regionConds: SQL[] = [inArray(noticeRegions.sido, q.sidos)];
      if (q.sigungu) {
        // 시군구 미상('')인 공고는 숨기지 않는다.
        regionConds.push(or(eq(noticeRegions.sigungu, q.sigungu), eq(noticeRegions.sigungu, ""))!);
      }
      // 지역 정보가 없는 공고(전국/미상)는 숨기지 않는다.
      conds.push(
        or(
          exists(
            this.db
              .select({ one: sql`1` })
              .from(noticeRegions)
              .where(and(eq(noticeRegions.noticeId, notices.id), ...regionConds)),
          ),
          notExists(this.db.select({ one: sql`1` }).from(noticeRegions).where(eq(noticeRegions.noticeId, notices.id))),
        )!,
      );
    }

    if (q.supplyTypes && q.supplyTypes.length > 0) conds.push(inArray(notices.supplyType, q.supplyTypes));

    if (q.housingTypes && q.housingTypes.length > 0) {
      // 주택유형을 알 수 없는 공고는 숨기지 않는다.
      conds.push(
        or(
          exists(
            this.db
              .select({ one: sql`1` })
              .from(noticeHousingTypes)
              .where(and(eq(noticeHousingTypes.noticeId, notices.id), inArray(noticeHousingTypes.housingType, q.housingTypes))),
          ),
          notExists(this.db.select({ one: sql`1` }).from(noticeHousingTypes).where(eq(noticeHousingTypes.noticeId, notices.id))),
        )!,
      );
    }

    if (q.maxDeposit !== undefined) conds.push(or(isNull(notices.minDeposit), lte(notices.minDeposit, q.maxDeposit))!);
    if (q.maxMonthlyRent !== undefined)
      conds.push(or(isNull(notices.minMonthlyRent), lte(notices.minMonthlyRent, q.maxMonthlyRent))!);
    if (q.minAreaM2 !== undefined) conds.push(or(isNull(notices.maxAreaM2), gte(notices.maxAreaM2, q.minAreaM2))!);
    if (q.maxAreaM2 !== undefined) conds.push(or(isNull(notices.minAreaM2), lte(notices.minAreaM2, q.maxAreaM2))!);

    const keyword = q.keyword?.trim();
    if (keyword) {
      const pattern = `%${escapeLike(keyword)}%`;
      conds.push(
        or(
          sql`${notices.title} LIKE ${pattern} ESCAPE '\\'`,
          sql`${notices.organization} LIKE ${pattern} ESCAPE '\\'`,
          exists(
            this.db
              .select({ one: sql`1` })
              .from(complexes)
              .where(
                and(
                  eq(complexes.noticeId, notices.id),
                  or(
                    sql`${complexes.name} LIKE ${pattern} ESCAPE '\\'`,
                    sql`${complexes.address} LIKE ${pattern} ESCAPE '\\'`,
                  ),
                ),
              ),
          ),
        )!,
      );
    }

    return and(...conds);
  }

  async search(q: NoticeSearchQuery): Promise<NoticeSearchResult> {
    const where = this.buildWhere(q);

    const totalRow = this.db.select({ count: sql<number>`count(*)` }).from(notices).where(where).get();
    const total = totalRow?.count ?? 0;

    const orderBy =
      q.sort === "latest"
        ? [sql`coalesce(${notices.announcementDate}, ${notices.applicationStart}, substr(${notices.createdAt}, 1, 10)) DESC`, asc(notices.id)]
        : [sql`${notices.applicationEnd} IS NULL`, asc(notices.applicationEnd), asc(notices.id)];

    let query = this.db.select({ id: notices.id }).from(notices).where(where).orderBy(...orderBy).$dynamic();
    if (q.limit !== undefined) query = query.limit(q.limit).offset(q.offset ?? 0);
    const ids = query.all().map((r) => r.id);

    const hydrated = this.hydrate(ids);
    return { items: hydrated, total };
  }

  async findById(id: string): Promise<Notice | null> {
    return this.hydrate([id])[0] ?? null;
  }

  async findExistingFor(incoming: Notice[]): Promise<Notice[]> {
    const ids = new Set<string>();
    const mergeKeys = [...new Set(incoming.map((n) => n.mergeKey))];
    for (const keys of chunk(mergeKeys)) {
      for (const r of this.db.select({ id: notices.id }).from(notices).where(inArray(notices.mergeKey, keys)).all()) ids.add(r.id);
    }
    for (const n of incoming) {
      for (const s of n.sources) {
        const row = this.db
          .select({ noticeId: noticeSources.noticeId })
          .from(noticeSources)
          .where(and(eq(noticeSources.source, s.source), eq(noticeSources.externalId, s.externalId)))
          .get();
        if (row) ids.add(row.noticeId);
      }
    }
    return this.hydrate([...ids]);
  }

  // ---------------------------------------------------------------- hydrate

  private hydrate(ids: string[]): Notice[] {
    if (ids.length === 0) return [];

    const rowsById = new Map<string, typeof notices.$inferSelect>();
    const regionsBy = new Map<string, Array<{ sido: string; sigungu: string }>>();
    const housingBy = new Map<string, string[]>();
    const complexRows: Array<typeof complexes.$inferSelect> = [];
    const unitRows: Array<typeof unitTypes.$inferSelect> = [];
    const sourcesBy = new Map<string, Array<typeof noticeSources.$inferSelect>>();

    for (const part of chunk(ids)) {
      for (const r of this.db.select().from(notices).where(inArray(notices.id, part)).all()) rowsById.set(r.id, r);
      for (const r of this.db.select().from(noticeRegions).where(inArray(noticeRegions.noticeId, part)).all()) {
        (regionsBy.get(r.noticeId) ?? regionsBy.set(r.noticeId, []).get(r.noticeId)!).push(r);
      }
      for (const r of this.db.select().from(noticeHousingTypes).where(inArray(noticeHousingTypes.noticeId, part)).all()) {
        (housingBy.get(r.noticeId) ?? housingBy.set(r.noticeId, []).get(r.noticeId)!).push(r.housingType);
      }
      const cRows = this.db.select().from(complexes).where(inArray(complexes.noticeId, part)).orderBy(asc(complexes.position)).all();
      complexRows.push(...cRows);
      for (const sub of chunk(cRows.map((c) => c.id))) {
        unitRows.push(...this.db.select().from(unitTypes).where(inArray(unitTypes.complexId, sub)).orderBy(asc(unitTypes.position)).all());
      }
      for (const r of this.db.select().from(noticeSources).where(inArray(noticeSources.noticeId, part)).all()) {
        (sourcesBy.get(r.noticeId) ?? sourcesBy.set(r.noticeId, []).get(r.noticeId)!).push(r);
      }
    }

    const unitsByComplex = new Map<string, Complex["units"]>();
    for (const u of unitRows) {
      const list = unitsByComplex.get(u.complexId) ?? [];
      list.push({
        name: u.name,
        exclusiveAreaM2: u.exclusiveAreaM2,
        households: u.households,
        deposit: u.deposit,
        monthlyRent: u.monthlyRent,
      });
      unitsByComplex.set(u.complexId, list);
    }
    const complexesByNotice = new Map<string, Complex[]>();
    for (const c of complexRows) {
      const list = complexesByNotice.get(c.noticeId) ?? [];
      list.push({
        name: c.name,
        address: c.address,
        region: c.sido ? { sido: c.sido as Sido, sigungu: c.sigungu || null } : null,
        housingType: c.housingType as HousingType,
        households: c.households,
        units: unitsByComplex.get(c.id) ?? [],
      });
      complexesByNotice.set(c.noticeId, list);
    }

    const result: Notice[] = [];
    for (const id of ids) {
      const r = rowsById.get(id);
      if (!r) continue;
      result.push({
        id: r.id,
        mergeKey: r.mergeKey,
        title: r.title,
        organization: r.organization,
        supplyType: r.supplyType as SupplyType,
        housingTypes: (housingBy.get(id) ?? []) as HousingType[],
        regions: (regionsBy.get(id) ?? []).map((x) => ({ sido: x.sido as Sido, sigungu: x.sigungu || null })),
        applicationStart: r.applicationStart,
        applicationEnd: r.applicationEnd,
        announcementDate: r.announcementDate,
        winnerAnnouncementDate: r.winnerAnnouncementDate,
        totalHouseholds: r.totalHouseholds,
        eligibilityText: r.eligibilityText,
        url: r.url,
        complexes: complexesByNotice.get(id) ?? [],
        sources: (sourcesBy.get(id) ?? []).map(
          (s): NoticeSourceRef => ({
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

  // ---------------------------------------------------------------- upsert

  async upsertMany(items: Notice[]): Promise<UpsertResult> {
    let inserted = 0;
    let updated = 0;
    const nowIso = new Date().toISOString();

    this.db.transaction((tx) => {
      for (const n of items) {
        const existing = tx.select({ id: notices.id, createdAt: notices.createdAt }).from(notices).where(eq(notices.id, n.id)).get();
        const summary = summarizeUnits(n);
        const values = {
          id: n.id,
          mergeKey: n.mergeKey,
          title: n.title,
          organization: n.organization,
          supplyType: n.supplyType,
          applicationStart: n.applicationStart,
          applicationEnd: n.applicationEnd,
          announcementDate: n.announcementDate,
          winnerAnnouncementDate: n.winnerAnnouncementDate,
          totalHouseholds: n.totalHouseholds,
          eligibilityText: n.eligibilityText,
          url: n.url,
          minDeposit: summary.minDeposit,
          minMonthlyRent: summary.minMonthlyRent,
          minAreaM2: summary.minAreaM2,
          maxAreaM2: summary.maxAreaM2,
          createdAt: existing?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
        tx.insert(notices).values(values).onConflictDoUpdate({ target: notices.id, set: values }).run();
        if (existing) updated++;
        else inserted++;

        // 자식 테이블은 통째로 교체
        tx.delete(noticeRegions).where(eq(noticeRegions.noticeId, n.id)).run();
        tx.delete(noticeHousingTypes).where(eq(noticeHousingTypes.noticeId, n.id)).run();
        tx.delete(complexes).where(eq(complexes.noticeId, n.id)).run(); // unit_types 는 cascade
        tx.delete(noticeSources).where(eq(noticeSources.noticeId, n.id)).run();
        for (const s of n.sources) {
          tx.delete(noticeSources).where(and(eq(noticeSources.source, s.source), eq(noticeSources.externalId, s.externalId))).run();
        }

        const regionRows = new Map<string, { noticeId: string; sido: string; sigungu: string }>();
        for (const r of [...n.regions, ...n.complexes.flatMap((c) => (c.region ? [c.region] : []))]) {
          const row = { noticeId: n.id, sido: r.sido, sigungu: r.sigungu ?? "" };
          regionRows.set(`${row.sido}/${row.sigungu}`, row);
        }
        if (regionRows.size > 0) tx.insert(noticeRegions).values([...regionRows.values()]).run();

        const housing = [...new Set(n.housingTypes.concat(n.complexes.map((c) => c.housingType)))];
        if (housing.length > 0) tx.insert(noticeHousingTypes).values(housing.map((h) => ({ noticeId: n.id, housingType: h }))).run();

        n.complexes.forEach((c, ci) => {
          const complexId = `${n.id}:c${ci}`;
          tx.insert(complexes)
            .values({
              id: complexId,
              noticeId: n.id,
              position: ci,
              name: c.name,
              address: c.address,
              sido: c.region?.sido ?? null,
              sigungu: c.region?.sigungu ?? null,
              housingType: c.housingType,
              households: c.households,
            })
            .run();
          if (c.units.length > 0) {
            tx.insert(unitTypes)
              .values(
                c.units.map((u, ui) => ({
                  id: `${complexId}:u${ui}`,
                  complexId,
                  position: ui,
                  name: u.name,
                  exclusiveAreaM2: u.exclusiveAreaM2,
                  households: u.households,
                  deposit: u.deposit,
                  monthlyRent: u.monthlyRent,
                })),
              )
              .run();
          }
        });

        if (n.sources.length > 0) {
          tx.insert(noticeSources)
            .values(
              n.sources.map((s) => ({
                source: s.source,
                externalId: s.externalId,
                noticeId: n.id,
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

