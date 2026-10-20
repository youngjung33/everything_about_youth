CREATE TABLE `complexes` (
	`id` text PRIMARY KEY NOT NULL,
	`notice_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text,
	`address` text,
	`sido` text,
	`sigungu` text,
	`housing_type` text NOT NULL,
	`households` integer,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `complexes_notice_idx` ON `complexes` (`notice_id`);--> statement-breakpoint
CREATE TABLE `notice_housing_types` (
	`notice_id` text NOT NULL,
	`housing_type` text NOT NULL,
	PRIMARY KEY(`notice_id`, `housing_type`),
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notice_housing_types_idx` ON `notice_housing_types` (`housing_type`);--> statement-breakpoint
CREATE TABLE `notice_regions` (
	`notice_id` text NOT NULL,
	`sido` text NOT NULL,
	`sigungu` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`notice_id`, `sido`, `sigungu`),
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notice_regions_sido_idx` ON `notice_regions` (`sido`,`sigungu`);--> statement-breakpoint
CREATE TABLE `notice_sources` (
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`notice_id` text NOT NULL,
	`url` text,
	`raw_payload` text,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`source`, `external_id`),
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notice_sources_notice_idx` ON `notice_sources` (`notice_id`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`merge_key` text NOT NULL,
	`title` text NOT NULL,
	`organization` text NOT NULL,
	`supply_type` text NOT NULL,
	`application_start` text,
	`application_end` text,
	`announcement_date` text,
	`winner_announcement_date` text,
	`total_households` integer,
	`eligibility_text` text,
	`url` text,
	`min_deposit` integer,
	`min_monthly_rent` integer,
	`min_area_m2` real,
	`max_area_m2` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notices_merge_key_idx` ON `notices` (`merge_key`);--> statement-breakpoint
CREATE INDEX `notices_supply_type_idx` ON `notices` (`supply_type`);--> statement-breakpoint
CREATE INDEX `notices_application_end_idx` ON `notices` (`application_end`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
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
CREATE TABLE `unit_types` (
	`id` text PRIMARY KEY NOT NULL,
	`complex_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text,
	`exclusive_area_m2` real,
	`households` integer,
	`deposit` integer,
	`monthly_rent` integer,
	FOREIGN KEY (`complex_id`) REFERENCES `complexes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `unit_types_complex_idx` ON `unit_types` (`complex_id`);