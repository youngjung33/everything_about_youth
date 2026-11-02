import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "@/common/infrastructure/persistence/sqlite/schema";

export const financeSchemes = sqliteTable(
  "finance_schemes",
  {
    id: text("id").primaryKey(),
    mergeKey: text("merge_key").notNull(),
    title: text("title").notNull(),
    organization: text("organization").notNull(),
    productTypeId: text("product_type_id").notNull(),
    applicationStart: text("application_start"),
    applicationEnd: text("application_end"),
    announcementDate: text("announcement_date"),
    summary: text("summary"),
    url: text("url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("finance_schemes_merge_key_idx").on(t.mergeKey),
    index("finance_schemes_product_type_idx").on(t.productTypeId),
    index("finance_schemes_application_end_idx").on(t.applicationEnd),
  ],
);

export const financeSchemeRegions = sqliteTable(
  "finance_scheme_regions",
  {
    schemeId: text("scheme_id")
      .notNull()
      .references(() => financeSchemes.id, { onDelete: "cascade" }),
    sido: text("sido").notNull(),
    sigungu: text("sigungu").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.schemeId, t.sido, t.sigungu] }), index("finance_scheme_regions_sido_idx").on(t.sido, t.sigungu)],
);

export const financeSchemeTags = sqliteTable(
  "finance_scheme_tags",
  {
    schemeId: text("scheme_id")
      .notNull()
      .references(() => financeSchemes.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.schemeId, t.tag] }), index("finance_scheme_tags_tag_idx").on(t.tag)],
);

export const financeSchemeSources = sqliteTable(
  "finance_scheme_sources",
  {
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    schemeId: text("scheme_id")
      .notNull()
      .references(() => financeSchemes.id, { onDelete: "cascade" }),
    url: text("url"),
    rawPayload: text("raw_payload"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.source, t.externalId] }), index("finance_scheme_sources_program_idx").on(t.schemeId)],
);

export const savedFinanceSchemes = sqliteTable(
  "saved_finance_schemes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schemeId: text("scheme_id")
      .notNull()
      .references(() => financeSchemes.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.schemeId] }), index("saved_finance_schemes_user_idx").on(t.userId, t.createdAt)],
);

export const financeSyncRuns = sqliteTable("finance_sync_runs", {
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
