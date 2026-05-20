-- Expense system refactor: documents layer, business trips, extended expense fields
-- This migration adds three major components:
-- 1. documents table (Layer 1: file storage with OCR)
-- 2. business_trips table (employee travel management)
-- 3. Extended expenses table fields (GST, reimbursement, status, etc.)

-- ---------------------------------------------------------------------------
-- 1. Create documents table (Layer 1: file storage)
-- ---------------------------------------------------------------------------

CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`uploaded_by` text NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`purpose` text NOT NULL,
	`doc_type` text NOT NULL,
	`ocr_status` text DEFAULT 'pending' NOT NULL,
	`ocr_result` text,
	`ocr_confidence` real,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);

-- ---------------------------------------------------------------------------
-- 2. Create business_trips table
-- ---------------------------------------------------------------------------

CREATE TABLE `business_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`project_id` text,
	`destination` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days` integer NOT NULL,
	`daily_allowance_rate` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);

-- ---------------------------------------------------------------------------
-- 3. Extend expenses table with new columns
-- ---------------------------------------------------------------------------

-- Make project_id nullable (support company-level expenses)
-- Note: SQLite doesn't support ALTER COLUMN, so we add new columns only

-- Employee and document references
ALTER TABLE `expenses` ADD COLUMN `employee_id` text REFERENCES `employees`(`id`);
ALTER TABLE `expenses` ADD COLUMN `document_id` text REFERENCES `documents`(`id`);
ALTER TABLE `expenses` ADD COLUMN `trip_id` text REFERENCES `business_trips`(`id`);

-- Classification alias (cost_type mirrors cost_layer for new API)
ALTER TABLE `expenses` ADD COLUMN `cost_type` text DEFAULT 'cogs' NOT NULL;

-- Financial data
ALTER TABLE `expenses` ADD COLUMN `amount_sgd` real DEFAULT 0 NOT NULL;

-- Document reference display
ALTER TABLE `expenses` ADD COLUMN `doc_type` text;
ALTER TABLE `expenses` ADD COLUMN `doc_number` text;

-- GST fields
ALTER TABLE `expenses` ADD COLUMN `has_valid_tax_invoice` integer DEFAULT 0 NOT NULL;
ALTER TABLE `expenses` ADD COLUMN `gst_amount` real DEFAULT 0;

-- Payment & reimbursement
ALTER TABLE `expenses` ADD COLUMN `payment_method` text DEFAULT 'company_paid' NOT NULL;
ALTER TABLE `expenses` ADD COLUMN `reimbursement_status` text;

-- Core display fields
ALTER TABLE `expenses` ADD COLUMN `counterparty` text;
ALTER TABLE `expenses` ADD COLUMN `description` text;

-- Record status
ALTER TABLE `expenses` ADD COLUMN `status` text DEFAULT 'confirmed' NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Backfill cost_type from cost_layer for existing records
-- ---------------------------------------------------------------------------

UPDATE `expenses` SET `cost_type` = `cost_layer` WHERE `cost_type` = 'cogs' AND `cost_layer` = 'opex';

-- ---------------------------------------------------------------------------
-- 5. Backfill amount_sgd for SGD expenses
-- ---------------------------------------------------------------------------

UPDATE `expenses` SET `amount_sgd` = `amount` WHERE `currency` = 'SGD' AND `amount_sgd` = 0;
