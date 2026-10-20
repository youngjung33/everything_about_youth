import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 개념 모델은 Postgres(Supabase)로 그대로 옮길 수 있도록 설계:
 *  - ID는 문자열, 날짜는 'YYYY-MM-DD' 텍스트(→ date), 시각은 ISO 텍스트(→ timestamptz)
 *  - 배열/JSON 컬럼 대신 조인 테이블 사용 (raw_payload 만 JSON 텍스트 → jsonb)
 *  - 사용자(user_id) 개념은 1차에서 넣지 않는다.
 */
export const notices = sqliteTable(
  "notices",
  {
    id: text("id").primaryKey(),
    mergeKey: text("merge_key").notNull(),
    title: text("title").notNull(),
    organization: text("organization").notNull(),
    supplyType: text("supply_type").notNull(),
    applicationStart: text("application_start"),
    applicationEnd: text("application_end"),
    announcementDate: text("announcement_date"),
    winnerAnnouncementDate: text("winner_announcement_date"),
    totalHouseholds: integer("total_households"),
    eligibilityText: text("eligibility_text"),
    url: text("url"),
    // 검색용 비정규화 요약값 (units 에서 계산)
    minDeposit: integer("min_deposit"),
    minMonthlyRent: integer("min_monthly_rent"),
    minAreaM2: real("min_area_m2"),
    maxAreaM2: real("max_area_m2"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("notices_merge_key_idx").on(t.mergeKey),
    index("notices_supply_type_idx").on(t.supplyType),
    index("notices_application_end_idx").on(t.applicationEnd),
  ],
);

export const noticeRegions = sqliteTable(
  "notice_regions",
  {
    noticeId: text("notice_id")
      .notNull()
      .references(() => notices.id, { onDelete: "cascade" }),
    sido: text("sido").notNull(),
    /** 시군구 없음은 빈 문자열 */
    sigungu: text("sigungu").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.noticeId, t.sido, t.sigungu] }), index("notice_regions_sido_idx").on(t.sido, t.sigungu)],
);

export const noticeHousingTypes = sqliteTable(
  "notice_housing_types",
  {
    noticeId: text("notice_id")
      .notNull()
      .references(() => notices.id, { onDelete: "cascade" }),
    housingType: text("housing_type").notNull(),
  },
  (t) => [primaryKey({ columns: [t.noticeId, t.housingType] }), index("notice_housing_types_idx").on(t.housingType)],
);

export const complexes = sqliteTable(
  "complexes",
  {
    id: text("id").primaryKey(),
    noticeId: text("notice_id")
      .notNull()
      .references(() => notices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name"),
    address: text("address"),
    sido: text("sido"),
    sigungu: text("sigungu"),
    housingType: text("housing_type").notNull(),
    households: integer("households"),
  },
  (t) => [index("complexes_notice_idx").on(t.noticeId)],
);

export const unitTypes = sqliteTable(
  "unit_types",
  {
    id: text("id").primaryKey(),
    complexId: text("complex_id")
      .notNull()
      .references(() => complexes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name"),
    exclusiveAreaM2: real("exclusive_area_m2"),
    households: integer("households"),
    deposit: integer("deposit"),
    monthlyRent: integer("monthly_rent"),
  },
  (t) => [index("unit_types_complex_idx").on(t.complexId)],
);

export const noticeSources = sqliteTable(
  "notice_sources",
  {
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    noticeId: text("notice_id")
      .notNull()
      .references(() => notices.id, { onDelete: "cascade" }),
    url: text("url"),
    rawPayload: text("raw_payload"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.source, t.externalId] }), index("notice_sources_notice_idx").on(t.noticeId)],
);

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  fetchedCount: integer("fetched_count").notNull().default(0),
  insertedCount: integer("inserted_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  error: text("error"),
});
