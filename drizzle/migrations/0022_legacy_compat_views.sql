-- Compatibility layer after dropping legacy tables.
-- Reintroduces legacy names as views mapped onto revenue/expenses.

PRAGMA foreign_keys=OFF;

DROP VIEW IF EXISTS `invoices_out`;
CREATE VIEW `invoices_out` AS
SELECT
  r.id AS id,
  r.project_id AS project_id,
  NULL AS customer_id,
  NULL AS business_partner_id,
  COALESCE(r.invoice_number, r.id) AS invoice_no,
  r.date AS date,
  NULL AS due_date,
  r.currency AS currency,
  COALESCE(r.amount, 0) - COALESCE(r.gst_amount, 0) AS subtotal,
  CASE r.invoice_type
    WHEN 'zero_rate' THEN 'zero'
    WHEN 'tax_invoice' THEN 'standard'
    ELSE 'standard'
  END AS gst_type,
  COALESCE(r.gst_amount, 0) AS gst_amount,
  COALESCE(r.amount, 0) AS total,
  'completed' AS status,
  r.document_ref AS pdf_url,
  NULL AS line_items,
  r.created_at AS created_at,
  r.updated_at AS updated_at,
  r.deleted_at AS deleted_at
FROM `revenue` r;

DROP VIEW IF EXISTS `invoices_in`;
CREATE VIEW `invoices_in` AS
SELECT
  e.id AS id,
  COALESCE(e.project_id, '') AS project_id,
  NULL AS po_id,
  NULL AS business_partner_id,
  e.vendor_or_supplier AS supplier_name,
  e.date AS invoice_date,
  COALESCE(e.amount, 0) AS amount,
  e.currency AS currency,
  COALESCE(e.gst_amount, 0) AS gst_amount,
  NULL AS due_date,
  json_extract(e.metadata, '$.po_number') AS po_number,
  COALESCE(json_extract(e.metadata, '$.legacy_status'), 'pending_review') AS status,
  e.document_ref AS file_url,
  NULL AS ocr_confidence,
  NULL AS raw_ocr,
  e.created_at AS created_at,
  e.updated_at AS updated_at,
  e.deleted_at AS deleted_at
FROM `expenses` e
WHERE e.expense_type = 'sales_cost';

DROP VIEW IF EXISTS `payments`;
CREATE VIEW `payments` AS
SELECT
  r.id AS id,
  'inbound' AS direction,
  NULL AS business_partner_id,
  r.project_id AS project_id,
  r.id AS invoice_id,
  'customer' AS invoice_type,
  COALESCE(r.amount, 0) AS amount,
  r.currency AS currency,
  r.date AS payment_date,
  'other' AS method,
  NULL AS reference,
  'completed' AS status,
  r.notes AS note,
  r.created_at AS created_at,
  r.updated_at AS updated_at,
  r.deleted_at AS deleted_at
FROM `revenue` r
UNION ALL
SELECT
  e.id AS id,
  'outbound' AS direction,
  NULL AS business_partner_id,
  e.project_id AS project_id,
  e.id AS invoice_id,
  'supplier' AS invoice_type,
  COALESCE(e.amount, 0) AS amount,
  e.currency AS currency,
  e.date AS payment_date,
  'other' AS method,
  NULL AS reference,
  'completed' AS status,
  e.notes AS note,
  e.created_at AS created_at,
  e.updated_at AS updated_at,
  e.deleted_at AS deleted_at
FROM `expenses` e
WHERE e.expense_type = 'sales_cost';

DROP VIEW IF EXISTS `business_trips`;
CREATE VIEW `business_trips` AS
SELECT
  e.id AS id,
  NULL AS employee_id,
  e.project_id AS project_id,
  COALESCE(e.destination, json_extract(e.metadata, '$.destination')) AS destination,
  COALESCE(json_extract(e.metadata, '$.date_start'), e.date) AS start_date,
  COALESCE(json_extract(e.metadata, '$.date_end'), e.date) AS end_date,
  COALESCE(CAST(json_extract(e.metadata, '$.days') AS INTEGER), 1) AS days,
  COALESCE(CAST(json_extract(e.metadata, '$.daily_rate') AS REAL), 0) AS daily_allowance_rate,
  'completed' AS status,
  e.notes AS notes,
  e.created_at AS created_at,
  e.updated_at AS updated_at,
  e.deleted_at AS deleted_at
FROM `expenses` e
WHERE e.business_trip = 1;

-- Write-through triggers for invoices_out -> revenue
DROP TRIGGER IF EXISTS `trg_invoices_out_insert`;
CREATE TRIGGER `trg_invoices_out_insert`
INSTEAD OF INSERT ON `invoices_out`
BEGIN
  INSERT INTO `revenue` (
    `id`, `project_id`, `invoice_type`, `invoice_number`, `date`,
    `amount`, `currency`, `sgd_equivalent`, `gst_amount`, `document_ref`,
    `notes`, `created_at`, `updated_at`, `deleted_at`
  )
  VALUES (
    COALESCE(NEW.id, lower(hex(randomblob(16)))),
    NEW.project_id,
    CASE NEW.gst_type WHEN 'zero' THEN 'zero_rate' ELSE 'standard' END,
    NEW.invoice_no,
    NEW.date,
    COALESCE(NEW.total, NEW.subtotal, 0),
    COALESCE(NEW.currency, 'SGD'),
    CASE WHEN COALESCE(NEW.currency, 'SGD') = 'SGD' THEN COALESCE(NEW.total, NEW.subtotal, 0) ELSE 0 END,
    COALESCE(NEW.gst_amount, 0),
    NEW.pdf_url,
    NULL,
    COALESCE(NEW.created_at, CURRENT_TIMESTAMP),
    COALESCE(NEW.updated_at, CURRENT_TIMESTAMP),
    NEW.deleted_at
  );
END;

DROP TRIGGER IF EXISTS `trg_invoices_out_update`;
CREATE TRIGGER `trg_invoices_out_update`
INSTEAD OF UPDATE ON `invoices_out`
BEGIN
  UPDATE `revenue`
  SET
    `project_id` = NEW.project_id,
    `invoice_type` = CASE NEW.gst_type WHEN 'zero' THEN 'zero_rate' ELSE 'standard' END,
    `invoice_number` = NEW.invoice_no,
    `date` = NEW.date,
    `amount` = COALESCE(NEW.total, NEW.subtotal, 0),
    `currency` = COALESCE(NEW.currency, 'SGD'),
    `sgd_equivalent` = CASE WHEN COALESCE(NEW.currency, 'SGD') = 'SGD' THEN COALESCE(NEW.total, NEW.subtotal, 0) ELSE COALESCE(`sgd_equivalent`, 0) END,
    `gst_amount` = COALESCE(NEW.gst_amount, 0),
    `document_ref` = NEW.pdf_url,
    `updated_at` = CURRENT_TIMESTAMP
  WHERE `id` = OLD.id;
END;

DROP TRIGGER IF EXISTS `trg_invoices_out_delete`;
CREATE TRIGGER `trg_invoices_out_delete`
INSTEAD OF DELETE ON `invoices_out`
BEGIN
  UPDATE `revenue` SET `deleted_at` = CURRENT_TIMESTAMP, `updated_at` = CURRENT_TIMESTAMP WHERE `id` = OLD.id;
END;

PRAGMA foreign_keys=ON;
