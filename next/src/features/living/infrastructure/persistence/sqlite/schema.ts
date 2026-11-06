import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "@/common/infrastructure/persistence/sqlite/schema";

export const livingGuides = sqliteTable(
  "living_guides",
  {
    id: text("id").primaryKey(),
    mergeKey: text("merge_key").notNull(),
    title: text("title").notNull(),
    organization: text("organization").notNull(),
    procedureTypeId: text("procedure_type_id").notNull(),
    applicationStart: text("application_start"),
    applicationEnd: text("application_end"),
    announcementDate: text("announcement_date"),
    summary: text("summary"),
    checklistSteps: text("checklist_steps"),
    url: text("url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("living_guides_merge_key_idx").on(t.mergeKey),
    index("living_guides_procedure_type_idx").on(t.procedureTypeId),
    index("living_guides_application_end_idx").on(t.applicationEnd),
  ],
);

export const livingGuideRegions = sqliteTable(
  "living_guide_regions",
  {
    guideId: text("guide_id")
      .notNull()
      .references(() => livingGuides.id, { onDelete: "cascade" }),
    sido: text("sido").notNull(),
    sigungu: text("sigungu").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.guideId, t.sido, t.sigungu] }), index("living_guide_regions_sido_idx").on(t.sido, t.sigungu)],
);

export const livingGuideTags = sqliteTable(
  "living_guide_tags",
  {
    guideId: text("guide_id")
      .notNull()
      .references(() => livingGuides.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.guideId, t.tag] }), index("living_guide_tags_tag_idx").on(t.tag)],
);

export const livingGuideSources = sqliteTable(
  "living_guide_sources",
  {
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    guideId: text("guide_id")
      .notNull()
      .references(() => livingGuides.id, { onDelete: "cascade" }),
    url: text("url"),
    rawPayload: text("raw_payload"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.source, t.externalId] }), index("living_guide_sources_guide_idx").on(t.guideId)],
);

export const savedLivingGuides = sqliteTable(
  "saved_living_guides",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    guideId: text("guide_id")
      .notNull()
      .references(() => livingGuides.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.guideId] }), index("saved_living_guides_user_idx").on(t.userId, t.createdAt)],
);

export const livingSyncRuns = sqliteTable("living_sync_runs", {
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
