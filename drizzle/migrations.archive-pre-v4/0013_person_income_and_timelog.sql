-- Migration 0013: PersonIncome + TimeLog tables

CREATE TABLE IF NOT EXISTS `person_income` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL REFERENCES `persons`(`id`),
	`source` text NOT NULL,
	`source_id` text,
	`role_type` text,
	`income_type` text NOT NULL,
	`amount` real NOT NULL,
	`taxable_amount` real,
	`currency` text NOT NULL DEFAULT 'SGD',
	`period` text,
	`project_id` text REFERENCES `projects`(`id`),
	`year_of_assessment` text,
	`tax_treatment` text NOT NULL DEFAULT 'taxable',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE IF NOT EXISTS `time_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL REFERENCES `persons`(`id`),
	`project_id` text REFERENCES `projects`(`id`),
	`date` text NOT NULL,
	`hours` real NOT NULL,
	`description` text,
	`billable` integer NOT NULL DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
