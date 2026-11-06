CREATE TABLE `living_guide_regions` (
	`guide_id` text NOT NULL,
	`sido` text NOT NULL,
	`sigungu` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`guide_id`, `sido`, `sigungu`),
	FOREIGN KEY (`guide_id`) REFERENCES `living_guides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `living_guide_regions_sido_idx` ON `living_guide_regions` (`sido`,`sigungu`);--> statement-breakpoint
CREATE TABLE `living_guide_sources` (
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`guide_id` text NOT NULL,
	`url` text,
	`raw_payload` text,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`source`, `external_id`),
	FOREIGN KEY (`guide_id`) REFERENCES `living_guides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `living_guide_sources_guide_idx` ON `living_guide_sources` (`guide_id`);--> statement-breakpoint
CREATE TABLE `living_guide_tags` (
	`guide_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`guide_id`, `tag`),
	FOREIGN KEY (`guide_id`) REFERENCES `living_guides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `living_guide_tags_tag_idx` ON `living_guide_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `living_guides` (
	`id` text PRIMARY KEY NOT NULL,
	`merge_key` text NOT NULL,
	`title` text NOT NULL,
	`organization` text NOT NULL,
	`procedure_type_id` text NOT NULL,
	`application_start` text,
	`application_end` text,
	`announcement_date` text,
	`summary` text,
	`checklist_steps` text,
	`url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `living_guides_merge_key_idx` ON `living_guides` (`merge_key`);--> statement-breakpoint
CREATE INDEX `living_guides_procedure_type_idx` ON `living_guides` (`procedure_type_id`);--> statement-breakpoint
CREATE INDEX `living_guides_application_end_idx` ON `living_guides` (`application_end`);--> statement-breakpoint
CREATE TABLE `living_sync_runs` (
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
CREATE TABLE `saved_living_guides` (
	`user_id` text NOT NULL,
	`guide_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `guide_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guide_id`) REFERENCES `living_guides`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_living_guides_user_idx` ON `saved_living_guides` (`user_id`,`created_at`);
