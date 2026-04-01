-- Reset non-OCR tables for repeatable local testing
DELETE FROM audit_logs;
DELETE FROM employee_salaries;
DELETE FROM project_compensations;
DELETE FROM invoices_in;
DELETE FROM invoices_out;
DELETE FROM purchase_orders;
DELETE FROM quotations;
DELETE FROM contracts;
DELETE FROM expenses;
DELETE FROM gst_returns;
DELETE FROM company_settings;
DELETE FROM expense_categories;
DELETE FROM projects;
DELETE FROM employees;
DELETE FROM customers;
DELETE FROM users;

-- Users (for auth + audit demos)
INSERT INTO users (id, email, name, role, created_at, updated_at, deleted_at)
VALUES
	('usr-owner-001', 'owner@smartfin.local', 'Owner Demo', 'owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('usr-fin-001', 'finance@smartfin.local', 'Finance Demo', 'finance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('usr-pm-001', 'pm@smartfin.local', 'Project Manager Demo', 'project_manager', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

-- Customers
INSERT INTO customers (id, name, address, contact, gst_reg_no, metadata, created_at, updated_at, deleted_at)
VALUES
	(
		'cust-demo-001',
		'Demo Trading Pte Ltd',
		'1 Raffles Place, Singapore',
		'finance@demotrading.sg',
		'GST-REG-DEMO-001',
		'{"source":"mock-seed"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'cust-demo-002',
		'Lion City Imports',
		'80 Robinson Road, Singapore',
		'ops@lioncity-imports.sg',
		'GST-REG-DEMO-002',
		'{"source":"mock-seed"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'cust-demo-003',
		'Harbourline Logistics',
		'10 Anson Road, Singapore',
		'accounts@harbourline.sg',
		'GST-REG-DEMO-003',
		'{"source":"mock-seed"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	);

-- Projects
INSERT INTO projects (id, customer_id, name, status, start_date, end_date, description, created_at, updated_at, deleted_at)
VALUES
	(
		'proj-demo-001',
		'cust-demo-001',
		'Indonesia Palm Oil Import FY26',
		'active',
		'2026-01-02',
		'2026-12-31',
		'Core import operation with monthly billing.',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'proj-demo-002',
		'cust-demo-002',
		'Malaysia Spare Parts Consolidation',
		'on_hold',
		'2026-01-15',
		'2026-09-30',
		'On hold due to supplier lead-time revision.',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'proj-demo-003',
		'cust-demo-003',
		'Thailand Fast-Moving Goods Pilot',
		'completed',
		'2025-10-01',
		'2026-02-28',
		'Completed pilot batch and final settlement.',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'proj-demo-004',
		'cust-demo-001',
		'Legacy Archive Project',
		'archived',
		'2025-01-01',
		'2025-10-30',
		'Archived for regression filtering checks.',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	);

-- AR contracts and quotations
INSERT INTO contracts (id, project_id, file_url, amount, currency, date, metadata, created_at, updated_at, deleted_at)
VALUES
	('ctr-demo-001', 'proj-demo-001', 'mock://contracts/ctr-demo-001.pdf', 180000, 'SGD', '2026-01-05', '{"version":"v1"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('ctr-demo-002', 'proj-demo-002', 'mock://contracts/ctr-demo-002.pdf', 90000, 'SGD', '2026-01-20', '{"version":"v1"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

INSERT INTO quotations (id, project_id, source_type, file_url, amount, currency, date, metadata, created_at, updated_at, deleted_at)
VALUES
	('quo-demo-001', 'proj-demo-001', 'customer', 'mock://quotations/quo-demo-001.pdf', 72000, 'SGD', '2026-02-03', '{"round":"R1"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('quo-demo-002', 'proj-demo-002', 'internal', 'mock://quotations/quo-demo-002.pdf', 35000, 'SGD', '2026-02-12', '{"round":"R1"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

-- Purchase orders and supplier invoices (kept as mock non-OCR flow)
INSERT INTO purchase_orders (id, project_id, po_number, file_url, supplier_name, amount, currency, date, created_at, updated_at, deleted_at)
VALUES
	('po-demo-001', 'proj-demo-001', 'PO-2026-001', 'mock://po/po-demo-001.pdf', 'PT Nusantara Supply', 42000, 'SGD', '2026-03-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('po-demo-002', 'proj-demo-002', 'PO-2026-002', 'mock://po/po-demo-002.pdf', 'KL Spare Parts Sdn Bhd', 15000, 'SGD', '2026-03-05', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

INSERT INTO invoices_in (id, project_id, po_id, supplier_name, invoice_date, amount, currency, gst_amount, due_date, po_number, status, file_url, ocr_confidence, raw_ocr, created_at, updated_at, deleted_at)
VALUES
	(
		'iin-demo-001',
		'proj-demo-001',
		'po-demo-001',
		'PT Nusantara Supply',
		'2026-03-10',
		42000,
		'SGD',
		3780,
		'2026-04-09',
		'PO-2026-001',
		'confirmed',
		'mock://supplier-invoices/iin-demo-001.pdf',
		0.96,
		'{"method":"mock-seed","note":"non-ocr manual baseline"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'iin-demo-002',
		'proj-demo-002',
		'po-demo-002',
		'KL Spare Parts Sdn Bhd',
		'2026-03-14',
		15000,
		'SGD',
		1350,
		'2026-04-13',
		'PO-2026-002',
		'pending_review',
		'mock://supplier-invoices/iin-demo-002.pdf',
		0.88,
		'{"method":"mock-seed","note":"pending confirmation sample"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	);

-- Customer invoices
INSERT INTO invoices_out (id, project_id, customer_id, invoice_no, date, due_date, currency, subtotal, gst_type, gst_amount, total, status, pdf_url, line_items, created_at, updated_at, deleted_at)
VALUES
	(
		'iout-demo-001',
		'proj-demo-001',
		'cust-demo-001',
		'INV-2026-001',
		'2026-03-03',
		'2026-03-31',
		'SGD',
		60000,
		'standard',
		5400,
		65400,
		'issued',
		'mock://customer-invoices/iout-demo-001.pdf',
		'[{"item":"Import service fee","qty":1,"unitPrice":60000}]',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'iout-demo-002',
		'proj-demo-001',
		'cust-demo-001',
		'INV-2026-002',
		'2026-03-18',
		'2026-04-17',
		'SGD',
		25000,
		'standard',
		2250,
		27250,
		'paid',
		'mock://customer-invoices/iout-demo-002.pdf',
		'[{"item":"Storage and logistics fee","qty":1,"unitPrice":25000}]',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'iout-demo-003',
		'proj-demo-002',
		'cust-demo-002',
		'INV-2026-003',
		'2026-02-26',
		'2026-03-28',
		'SGD',
		18000,
		'zero',
		0,
		18000,
		'draft',
		'mock://customer-invoices/iout-demo-003.pdf',
		'[{"item":"Consolidation service","qty":1,"unitPrice":18000}]',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	);

-- Employees and compensation
INSERT INTO employees (id, name, type, status, start_date, end_date, contact, tax_id, metadata, created_at, updated_at, deleted_at)
VALUES
	('emp-demo-001', 'Alice Tan', 'full_time', 'active', '2025-08-01', NULL, 'alice.tan@smartfin.local', 'S1234567A', '{"dept":"operations"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('emp-demo-002', 'Rahim Iskandar', 'part_time', 'active', '2025-11-01', NULL, 'rahim@smartfin.local', 'S2345678B', '{"dept":"finance"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('emp-demo-003', 'Wang Lei', 'freelancer', 'active', '2026-01-10', NULL, 'wang.lei@smartfin.local', 'F3344556C', '{"dept":"trade"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

INSERT INTO employee_salaries (id, employee_id, month, salary, allowance, cpf_employee, cpf_employer, created_at, updated_at, deleted_at)
VALUES
	('sal-demo-001', 'emp-demo-001', '2026-03', 6800, 500, 1360, 1156, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('sal-demo-002', 'emp-demo-002', '2026-03', 3200, 180, 640, 544, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('sal-demo-003', 'emp-demo-003', '2026-03', 4500, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

INSERT INTO project_compensations (id, project_id, employee_id, amount, type, description, date, created_at, updated_at, deleted_at)
VALUES
	('pc-demo-001', 'proj-demo-001', 'emp-demo-001', 2400, 'bonus', 'On-time customs clearance milestone', '2026-03-16', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('pc-demo-002', 'proj-demo-001', 'emp-demo-003', 1900, 'freelance_fee', 'Trade document review support', '2026-03-20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('pc-demo-003', 'proj-demo-002', 'emp-demo-002', 850, 'bonus', 'Supplier reconciliation support', '2026-03-22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

-- Expenses
INSERT INTO expense_categories (id, name, is_system, parent_id, created_at, updated_at, deleted_at)
VALUES
	('cat-demo-001', 'Logistics', 'true', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('cat-demo-002', 'Travel', 'true', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('cat-demo-003', 'Compliance', 'true', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

INSERT INTO expenses (id, project_id, category, subcategory, amount, currency, date, staff_name, file_url, ocr_data, metadata, created_at, updated_at, deleted_at)
VALUES
	(
		'exp-demo-001',
		'proj-demo-001',
		'Logistics',
		'Port handling',
		3200,
		'SGD',
		'2026-03-08',
		'Alice Tan',
		'mock://expenses/exp-demo-001.pdf',
		'{"source":"manual"}',
		'{"channel":"mock-seed"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'exp-demo-002',
		'proj-demo-002',
		'Compliance',
		'Import permit',
		1200,
		'SGD',
		'2026-03-12',
		'Rahim Iskandar',
		'mock://expenses/exp-demo-002.pdf',
		'{"source":"manual"}',
		'{"channel":"mock-seed"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	);

-- Tax settings and sample GST return
INSERT INTO company_settings (key, value, created_at, updated_at, deleted_at)
VALUES
	('gst_box9_manual', '1200', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('gst_box10_manual', '800', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('gst_box11_manual', '500', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
	('gst_box12_manual', '2000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL);

INSERT INTO gst_returns (id, quarter, year, box_1, box_2, box_3, box_4, box_5, box_6, box_7, box_8, box_9, box_10, box_11, box_12, box_13, status, generated_at, created_at, updated_at, deleted_at)
VALUES
	(
		'gst-demo-2026-q1',
		'Q1',
		'2026',
		85000,
		0,
		85000,
		7650,
		59400,
		5346,
		2304,
		0,
		1200,
		800,
		500,
		2000,
		125000,
		'draft',
		'2026-03-29T12:00:00Z',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	);

-- Audit log samples
INSERT INTO audit_logs (id, actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at, updated_at, deleted_at)
VALUES
	(
		'audit-demo-001',
		'usr-owner-001',
		'owner@smartfin.local',
		'login',
		'auth',
		'usr-owner-001',
		'{"source":"mock-seed"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	),
	(
		'audit-demo-002',
		'usr-fin-001',
		'finance@smartfin.local',
		'update_project',
		'project',
		'proj-demo-001',
		'{"source":"mock-seed"}',
		CURRENT_TIMESTAMP,
		CURRENT_TIMESTAMP,
		NULL
	);
