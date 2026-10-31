import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "@/common/infrastructure/persistence/sqlite/schema";

export const benefitPrograms = sqliteTable(
  "benefit_programs",
  {
    id: text("id").primaryKey(),
    mergeKey: text("merge_key").notNull(),
    title: text("title").notNull(),
    organization: text("organization").notNull(),
    categoryId: text("category_id").notNull(),
    applicationStart: text("application_start"),
    applicationEnd: text("application_end"),
    announcementDate: text("announcement_date"),
    summary: text("summary"),
    url: text("url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("benefit_programs_merge_key_idx").on(t.mergeKey),
    index("benefit_programs_category_idx").on(t.categoryId),
    index("benefit_programs_application_end_idx").on(t.applicationEnd),
  ],
);

export const programRegions = sqliteTable(
  "program_regions",
  {
    programId: text("program_id")
      .notNull()
      .references(() => benefitPrograms.id, { onDelete: "cascade" }),
    sido: text("sido").notNull(),
    sigungu: text("sigungu").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.programId, t.sido, t.sigungu] }), index("program_regions_sido_idx").on(t.sido, t.sigungu)],
);

export const programTags = sqliteTable(
  "program_tags",
  {
    programId: text("program_id")
      .notNull()
      .references(() => benefitPrograms.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.programId, t.tag] }), index("program_tags_tag_idx").on(t.tag)],
);

export const programSources = sqliteTable(
  "program_sources",
  {
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    programId: text("program_id")
      .notNull()
      .references(() => benefitPrograms.id, { onDelete: "cascade" }),
    url: text("url"),
    rawPayload: text("raw_payload"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.source, t.externalId] }), index("program_sources_program_idx").on(t.programId)],
);

export const savedBenefitPrograms = sqliteTable(
  "saved_benefit_programs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programId: text("program_id")
      .notNull()
      .references(() => benefitPrograms.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.programId] }), index("saved_benefit_programs_user_idx").on(t.userId, t.createdAt)],
);

export const benefitSyncRuns = sqliteTable("benefit_sync_runs", {
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
