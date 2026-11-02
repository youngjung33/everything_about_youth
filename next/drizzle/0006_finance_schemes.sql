CREATE TABLE `finance_scheme_regions` (
	`scheme_id` text NOT NULL,
	`sido` text NOT NULL,
	`sigungu` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`scheme_id`, `sido`, `sigungu`),
	FOREIGN KEY (`scheme_id`) REFERENCES `finance_schemes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finance_scheme_regions_sido_idx` ON `finance_scheme_regions` (`sido`,`sigungu`);--> statement-breakpoint
CREATE TABLE `finance_scheme_sources` (
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`scheme_id` text NOT NULL,
	`url` text,
	`raw_payload` text,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`source`, `external_id`),
	FOREIGN KEY (`scheme_id`) REFERENCES `finance_schemes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finance_scheme_sources_scheme_idx` ON `finance_scheme_sources` (`scheme_id`);--> statement-breakpoint
CREATE TABLE `finance_scheme_tags` (
	`scheme_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`scheme_id`, `tag`),
	FOREIGN KEY (`scheme_id`) REFERENCES `finance_schemes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finance_scheme_tags_tag_idx` ON `finance_scheme_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `finance_schemes` (
	`id` text PRIMARY KEY NOT NULL,
	`merge_key` text NOT NULL,
	`title` text NOT NULL,
	`organization` text NOT NULL,
	`product_type_id` text NOT NULL,
	`application_start` text,
	`application_end` text,
	`announcement_date` text,
	`summary` text,
	`url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `finance_schemes_merge_key_idx` ON `finance_schemes` (`merge_key`);--> statement-breakpoint
CREATE INDEX `finance_schemes_product_type_idx` ON `finance_schemes` (`product_type_id`);--> statement-breakpoint
CREATE INDEX `finance_schemes_application_end_idx` ON `finance_schemes` (`application_end`);--> statement-breakpoint
CREATE TABLE `finance_sync_runs` (
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
CREATE TABLE `saved_finance_schemes` (
	`user_id` text NOT NULL,
	`scheme_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `scheme_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scheme_id`) REFERENCES `finance_schemes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_finance_schemes_user_idx` ON `saved_finance_schemes` (`user_id`,`created_at`);