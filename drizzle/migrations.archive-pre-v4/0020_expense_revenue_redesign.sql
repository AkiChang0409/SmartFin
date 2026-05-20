-- Migration: Expense & Revenue redesign
-- Matches smartfin-expense-revenue-design.md specification
--
-- Strategy: SQLite cannot DROP columns, so we recreate the expenses table
-- with the new schema and migrate existing data.

-- Step 1: Create the new expenses table with redesigned schema
CREATE TABLE IF NOT EXISTS `expenses_new` (
  `id`                TEXT PRIMARY KEY NOT NULL,
  `project_id`        TEXT REFERENCES `projects`(`id`),

  -- Classification
  `expense_type`      TEXT NOT NULL,  -- 'opex' | 'sales_cost'
  `category`          TEXT NOT NULL,
  `doc_type`          TEXT,           -- 'invoice' | 'receipt' | 'po' | null

  -- Financial data
  `date`              TEXT NOT NULL,
  `amount`            REAL NOT NULL,
  `currency`          TEXT NOT NULL DEFAULT 'SGD',
  `sgd_equivalent`    REAL,
  `gst_amount`        REAL DEFAULT 0,

  -- Parties
  `vendor_or_supplier` TEXT,
  `staff_name`        TEXT,

  -- Business tags
  `reimbursement`     INTEGER NOT NULL DEFAULT 0,
  `business_trip`     INTEGER NOT NULL DEFAULT 0,
  `destination`       TEXT,

  -- File & scene-specific data
  `document_ref`      TEXT,
  `metadata`          TEXT,

  `notes`             TEXT,
  `created_at`        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`        TEXT
);

-- Step 2: Migrate existing data from old expenses table
INSERT INTO `expenses_new` (
  `id`, `project_id`,
  `expense_type`, `category`, `doc_type`,
  `date`, `amount`, `currency`, `sgd_equivalent`, `gst_amount`,
  `vendor_or_supplier`, `staff_name`,
  `reimbursement`, `business_trip`, `destination`,
  `document_ref`, `metadata`, `notes`,
  `created_at`, `updated_at`, `deleted_at`
)
SELECT
  `id`,
  `project_id`,
  -- Map cost_type/cost_layer: cogs -> sales_cost, opex -> opex
  CASE WHEN COALESCE(`cost_type`, `cost_layer`, 'opex') = 'cogs' THEN 'sales_cost' ELSE 'opex' END,
  `category`,
  `doc_type`,
  `date`,
  `amount`,
  `currency`,
  COALESCE(`amount_sgd`, 0),
  COALESCE(`gst_amount`, 0),
  `counterparty`,
  `staff_name`,
  CASE WHEN `payment_method` = 'employee_reimbursement' THEN 1 ELSE 0 END,
  CASE WHEN `trip_id` IS NOT NULL THEN 1 ELSE 0 END,
  NULL,
  COALESCE(`file_url`, NULL),
  `metadata`,
  `description`,
  `created_at`,
  `updated_at`,
  `deleted_at`
FROM `expenses`;

-- Step 3: Drop old table and rename new one
DROP TABLE `expenses`;
ALTER TABLE `expenses_new` RENAME TO `expenses`;

-- Step 4: Create the revenue table
CREATE TABLE IF NOT EXISTS `revenue` (
  `id`              TEXT PRIMARY KEY NOT NULL,
  `invoice_type`    TEXT NOT NULL,  -- 'standard' | 'zero_rate' | 'tax_invoice'
  `invoice_number`  TEXT,
  `client_name`     TEXT,
  `project_id`      TEXT REFERENCES `projects`(`id`),

  `date`            TEXT NOT NULL,
  `amount`          REAL NOT NULL,
  `currency`        TEXT NOT NULL DEFAULT 'SGD',
  `sgd_equivalent`  REAL,
  `gst_amount`      REAL DEFAULT 0,

  `document_ref`    TEXT,
  `notes`           TEXT,
  `created_at`      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at`      TEXT
);
