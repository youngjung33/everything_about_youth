CREATE TABLE `feature_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL,
	`updated_at` text NOT NULL
);
