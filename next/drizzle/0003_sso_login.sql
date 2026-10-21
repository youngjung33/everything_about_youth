CREATE TABLE `sso_tickets` (
	`ticket_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`challenge` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_identities` (
	`provider` text NOT NULL,
	`subject` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`provider`, `subject`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_identities_user_idx` ON `user_identities` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`last_login_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `auth_clients` ADD `user_id` text REFERENCES users(id) ON DELETE set null;