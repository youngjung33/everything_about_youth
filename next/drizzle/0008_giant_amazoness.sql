CREATE TABLE `job_posting_regions` (
	`posting_id` text NOT NULL,
	`sido` text NOT NULL,
	`sigungu` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`posting_id`, `sido`, `sigungu`),
	FOREIGN KEY (`posting_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_posting_regions_sido_idx` ON `job_posting_regions` (`sido`,`sigungu`);--> statement-breakpoint
CREATE TABLE `job_posting_sources` (
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`posting_id` text NOT NULL,
	`url` text,
	`raw_payload` text,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`source`, `external_id`),
	FOREIGN KEY (`posting_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_posting_sources_posting_idx` ON `job_posting_sources` (`posting_id`);--> statement-breakpoint
CREATE TABLE `job_posting_tags` (
	`posting_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`posting_id`, `tag`),
	FOREIGN KEY (`posting_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_posting_tags_tag_idx` ON `job_posting_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `job_postings` (
	`id` text PRIMARY KEY NOT NULL,
	`merge_key` text NOT NULL,
	`title` text NOT NULL,
	`organization` text NOT NULL,
	`hire_type_id` text NOT NULL,
	`application_start` text,
	`application_end` text,
	`announcement_date` text,
	`summary` text,
	`url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `job_postings_merge_key_idx` ON `job_postings` (`merge_key`);--> statement-breakpoint
CREATE INDEX `job_postings_hire_type_idx` ON `job_postings` (`hire_type_id`);--> statement-breakpoint
CREATE INDEX `job_postings_application_end_idx` ON `job_postings` (`application_end`);--> statement-breakpoint
CREATE TABLE `jobs_sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`fetched_count` integer DEFAULT 0 NOT NULL,
	`inserted_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `saved_job_postings` (
	`user_id` text NOT NULL,
	`posting_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `posting_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`posting_id`) REFERENCES `job_postings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_job_postings_user_idx` ON `saved_job_postings` (`user_id`,`created_at`);
