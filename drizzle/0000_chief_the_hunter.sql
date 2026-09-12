CREATE TABLE `visual_agreements` (
	`id` text PRIMARY KEY NOT NULL,
	`secret_hash` text NOT NULL,
	`snapshot` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visual_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`agreement_id` text NOT NULL,
	`descriptor` text NOT NULL,
	`status` text NOT NULL,
	`task_id` text,
	`receipt` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_visual_jobs_agreement` ON `visual_jobs` (`agreement_id`);--> statement-breakpoint
CREATE INDEX `idx_visual_jobs_created` ON `visual_jobs` (`created_at`);
