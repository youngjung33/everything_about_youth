CREATE TABLE `benefit_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`merge_key` text NOT NULL,
	`title` text NOT NULL,
	`organization` text NOT NULL,
	`category_id` text NOT NULL,
	`application_start` text,
	`application_end` text,
	`announcement_date` text,
	`summary` text,
	`url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `benefit_programs_merge_key_idx` ON `benefit_programs` (`merge_key`);--> statement-breakpoint
CREATE INDEX `benefit_programs_category_idx` ON `benefit_programs` (`category_id`);--> statement-breakpoint
CREATE INDEX `benefit_programs_application_end_idx` ON `benefit_programs` (`application_end`);--> statement-breakpoint
CREATE TABLE `benefit_sync_runs` (
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
CREATE TABLE `program_regions` (
	`program_id` text NOT NULL,
	`sido` text NOT NULL,
	`sigungu` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`program_id`, `sido`, `sigungu`),
	FOREIGN KEY (`program_id`) REFERENCES `benefit_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `program_regions_sido_idx` ON `program_regions` (`sido`,`sigungu`);--> statement-breakpoint
CREATE TABLE `program_sources` (
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`program_id` text NOT NULL,
	`url` text,
	`raw_payload` text,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`source`, `external_id`),
	FOREIGN KEY (`program_id`) REFERENCES `benefit_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `program_sources_program_idx` ON `program_sources` (`program_id`);--> statement-breakpoint
CREATE TABLE `program_tags` (
	`program_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`program_id`, `tag`),
	FOREIGN KEY (`program_id`) REFERENCES `benefit_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `program_tags_tag_idx` ON `program_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `saved_benefit_programs` (
	`user_id` text NOT NULL,
	`program_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `program_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`program_id`) REFERENCES `benefit_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_benefit_programs_user_idx` ON `saved_benefit_programs` (`user_id`,`created_at`);