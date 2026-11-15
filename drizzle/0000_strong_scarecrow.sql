CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`join_code` text NOT NULL,
	`open` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classes_join_code` ON `classes` (`join_code`);--> statement-breakpoint
CREATE INDEX `classes_owner` ON `classes` (`owner_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`baseline_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_token_hash` ON `students` (`token_hash`);--> statement-breakpoint
CREATE INDEX `students_class` ON `students` (`class_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	`event_id` text NOT NULL,
	`skill` text NOT NULL,
	`correct` integer,
	`level` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_student_event` ON `events` (`student_id`,`event_id`);--> statement-breakpoint
CREATE INDEX `events_student_skill` ON `events` (`student_id`,`skill`,`seq`);