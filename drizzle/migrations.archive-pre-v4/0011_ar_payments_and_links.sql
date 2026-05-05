-- Migration 0011: Payments + AR Document Links

CREATE TABLE IF NOT EXISTS `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`direction` text NOT NULL,
	`business_partner_id` text,
	`project_id` text REFERENCES `projects`(`id`),
	`invoice_id` text,
	`invoice_type` text,
	`amount` real NOT NULL,
	`currency` text NOT NULL DEFAULT 'SGD',
	`payment_date` text NOT NULL,
	`method` text,
	`reference` text,
	`status` text NOT NULL DEFAULT 'pending',
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE IF NOT EXISTS `ar_document_links` (
	`id` text PRIMARY KEY NOT NULL,
	`from_type` text NOT NULL,
	`from_id` text NOT NULL,
	`to_type` text NOT NULL,
	`to_id` text NOT NULL,
	`link_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
