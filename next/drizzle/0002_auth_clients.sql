CREATE TABLE `auth_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`revoked` integer DEFAULT false NOT NULL
);
