CREATE TABLE `student_accounts` (
	`student_id` text PRIMARY KEY NOT NULL,
	`login_hash` text NOT NULL,
	`game_json` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_mutation` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `student_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_student` ON `student_sessions` (`student_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `student_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `login_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_expiry` ON `login_limits` (`expires_at`);