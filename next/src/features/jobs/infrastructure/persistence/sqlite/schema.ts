import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "@/common/infrastructure/persistence/sqlite/schema";

export const jobPostings = sqliteTable(
  "job_postings",
  {
    id: text("id").primaryKey(),
    mergeKey: text("merge_key").notNull(),
    title: text("title").notNull(),
    organization: text("organization").notNull(),
    hireTypeId: text("hire_type_id").notNull(),
    applicationStart: text("application_start"),
    applicationEnd: text("application_end"),
    announcementDate: text("announcement_date"),
    summary: text("summary"),
    url: text("url"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("job_postings_merge_key_idx").on(t.mergeKey),
    index("job_postings_hire_type_idx").on(t.hireTypeId),
    index("job_postings_application_end_idx").on(t.applicationEnd),
  ],
);

export const jobPostingRegions = sqliteTable(
  "job_posting_regions",
  {
    postingId: text("posting_id")
      .notNull()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    sido: text("sido").notNull(),
    sigungu: text("sigungu").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.postingId, t.sido, t.sigungu] }), index("job_posting_regions_sido_idx").on(t.sido, t.sigungu)],
);

export const jobPostingTags = sqliteTable(
  "job_posting_tags",
  {
    postingId: text("posting_id")
      .notNull()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.postingId, t.tag] }), index("job_posting_tags_tag_idx").on(t.tag)],
);

export const jobPostingSources = sqliteTable(
  "job_posting_sources",
  {
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    postingId: text("posting_id")
      .notNull()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    url: text("url"),
    rawPayload: text("raw_payload"),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.source, t.externalId] }), index("job_posting_sources_posting_idx").on(t.postingId)],
);

export const savedJobPostings = sqliteTable(
  "saved_job_postings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postingId: text("posting_id")
      .notNull()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postingId] }), index("saved_job_postings_user_idx").on(t.userId, t.createdAt)],
);

export const jobsSyncRuns = sqliteTable("jobs_sync_runs", {
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
