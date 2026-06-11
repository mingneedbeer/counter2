ALTER TABLE `users` ADD `verified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationToken` text;