ALTER TABLE `admin_accounts` ADD `is_root` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `admin_accounts` ADD `permissions_json` text;