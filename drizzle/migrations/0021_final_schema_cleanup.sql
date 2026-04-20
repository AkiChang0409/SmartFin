-- Migration: Final expense/revenue-aligned schema cleanup
-- Drops legacy finance tables and updates AR/document structures.

PRAGMA foreign_keys=OFF;

-- ---------------------------------------------------------------------------
-- contracts: add client_name / contract_number / effective_date / expiry_date / scope / notes
-- and replace legacy `date` with `effective_date`
-- ---------------------------------------------------------------------------
CREATE TABLE `contracts_new` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `project_id` TEXT REFERENCES `projects`(`id`),
  `business_partner_id` TEXT,
  `client_name` TEXT,
  `contract_number` TEXT,
  `effective_date` TEXT,
  `expiry_date` TEXT,
  `amount` REAL,
  `currency` TEXT DEFAULT 'SGD',
  `scope` TEXT,
  `payment_terms` TEXT,
  `type` TEXT,
  `status` TEXT,
  `file_url` TEXT NOT NULL,
  `metadata` TEXT,
  `notes` TEXT,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TEXT
);

INSERT INTO `contracts_new` (
  `id`, `project_id`, `business_partner_id`, `amount`, `currency`,
  `type`, `status`, `file_url`, `payment_terms`, `metadata`,
  `created_at`, `updated_at`, `deleted_at`, `effective_date`
)
SELECT
  `id`, `project_id`, `business_partner_id`, `amount`, `currency`,
  `type`, `status`, `file_url`, `payment_terms`, `metadata`,
  `created_at`, `updated_at`, `deleted_at`, `date`
FROM `contracts`;

DROP TABLE `contracts`;
ALTER TABLE `contracts_new` RENAME TO `contracts`;

-- ---------------------------------------------------------------------------
-- quotations: remove source_type, add client_name / quotation_number / notes
-- ---------------------------------------------------------------------------
CREATE TABLE `quotations_new` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `project_id` TEXT NOT NULL REFERENCES `projects`(`id`),
  `business_partner_id` TEXT,
  `client_name` TEXT,
  `quotation_number` TEXT,
  `date` TEXT,
  `valid_until` TEXT,
  `amount` REAL,
  `currency` TEXT DEFAULT 'SGD',
  `line_items` TEXT,
  `status` TEXT,
  `file_url` TEXT,
  `metadata` TEXT,
  `notes` TEXT,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TEXT
);

INSERT INTO `quotations_new` (
  `id`, `project_id`, `business_partner_id`,
  `date`, `valid_until`, `amount`, `currency`,
  `line_items`, `status`, `file_url`, `metadata`,
  `created_at`, `updated_at`, `deleted_at`
)
SELECT
  `id`, `project_id`, `business_partner_id`,
  `date`, `valid_until`, `amount`, `currency`,
  `line_items`, `status`, `file_url`, `metadata`,
  `created_at`, `updated_at`, `deleted_at`
FROM `quotations`;

DROP TABLE `quotations`;
ALTER TABLE `quotations_new` RENAME TO `quotations`;

-- ---------------------------------------------------------------------------
-- purchase_orders: add client_name / description / notes
-- ---------------------------------------------------------------------------
CREATE TABLE `purchase_orders_new` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `project_id` TEXT NOT NULL REFERENCES `projects`(`id`),
  `business_partner_id` TEXT,
  `client_name` TEXT,
  `po_number` TEXT NOT NULL,
  `supplier_name` TEXT,
  `date` TEXT,
  `amount` REAL,
  `currency` TEXT DEFAULT 'SGD',
  `description` TEXT,
  `line_items` TEXT,
  `status` TEXT,
  `file_url` TEXT,
  `metadata` TEXT,
  `notes` TEXT,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TEXT
);

INSERT INTO `purchase_orders_new` (
  `id`, `project_id`, `business_partner_id`, `po_number`,
  `supplier_name`, `date`, `amount`, `currency`,
  `line_items`, `status`, `file_url`, `metadata`,
  `created_at`, `updated_at`, `deleted_at`
)
SELECT
  `id`, `project_id`, `business_partner_id`, `po_number`,
  `supplier_name`, `date`, `amount`, `currency`,
  `line_items`, `status`, `file_url`, `metadata`,
  `created_at`, `updated_at`, `deleted_at`
FROM `purchase_orders`;

DROP TABLE `purchase_orders`;
ALTER TABLE `purchase_orders_new` RENAME TO `purchase_orders`;
CREATE UNIQUE INDEX `purchase_orders_po_number_unique` ON `purchase_orders` (`po_number`);

-- ---------------------------------------------------------------------------
-- documents: add entity_type/entity_id and normalize ocr_status completed -> done
-- ---------------------------------------------------------------------------
CREATE TABLE `documents_new` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `project_id` TEXT REFERENCES `projects`(`id`),
  `uploaded_by` TEXT NOT NULL,
  `entity_type` TEXT,
  `entity_id` TEXT,
  `file_key` TEXT NOT NULL,
  `file_name` TEXT NOT NULL,
  `file_type` TEXT NOT NULL,
  `purpose` TEXT NOT NULL,
  `doc_type` TEXT NOT NULL,
  `ocr_status` TEXT NOT NULL DEFAULT 'pending',
  `ocr_result` TEXT,
  `ocr_confidence` REAL,
  `notes` TEXT,
  `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TEXT
);

INSERT INTO `documents_new` (
  `id`, `project_id`, `uploaded_by`,
  `file_key`, `file_name`, `file_type`,
  `purpose`, `doc_type`, `ocr_status`, `ocr_result`, `ocr_confidence`,
  `notes`, `created_at`, `updated_at`, `deleted_at`
)
SELECT
  `id`, `project_id`, `uploaded_by`,
  `file_key`, `file_name`, `file_type`,
  `purpose`, `doc_type`,
  CASE WHEN `ocr_status` = 'completed' THEN 'done' ELSE `ocr_status` END,
  `ocr_result`, `ocr_confidence`,
  `notes`, `created_at`, `updated_at`, `deleted_at`
FROM `documents`;

DROP TABLE `documents`;
ALTER TABLE `documents_new` RENAME TO `documents`;

-- ---------------------------------------------------------------------------
-- Drop legacy tables as requested by final design
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `invoices_in`;
DROP TABLE IF EXISTS `invoices_out`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `business_trips`;

PRAGMA foreign_keys=ON;
