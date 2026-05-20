CREATE TABLE `ar_document_links` (
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
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`business_partner_id` text,
	`client_name` text,
	`contract_number` text,
	`effective_date` text,
	`expiry_date` text,
	`scope` text,
	`type` text,
	`file_url` text NOT NULL,
	`amount` real,
	`currency` text DEFAULT 'SGD',
	`status` text,
	`payment_terms` text,
	`metadata` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices_in` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`po_id` text,
	`business_partner_id` text,
	`supplier_name` text,
	`invoice_date` text,
	`amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`gst_amount` real DEFAULT 0 NOT NULL,
	`due_date` text,
	`po_number` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`file_url` text NOT NULL,
	`ocr_confidence` real,
	`raw_ocr` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices_out` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`customer_id` text,
	`business_partner_id` text,
	`invoice_no` text NOT NULL,
	`date` text NOT NULL,
	`due_date` text,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`gst_type` text DEFAULT 'standard' NOT NULL,
	`gst_amount` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`pdf_url` text,
	`line_items` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_out_invoice_no_unique` ON `invoices_out` (`invoice_no`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`direction` text NOT NULL,
	`business_partner_id` text,
	`project_id` text,
	`invoice_id` text,
	`invoice_type` text,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`payment_date` text NOT NULL,
	`method` text,
	`reference` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`business_partner_id` text,
	`client_name` text,
	`po_number` text NOT NULL,
	`file_url` text,
	`supplier_name` text,
	`amount` real,
	`currency` text DEFAULT 'SGD',
	`date` text,
	`description` text,
	`status` text,
	`line_items` text,
	`metadata` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_po_number_unique` ON `purchase_orders` (`po_number`);--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`business_partner_id` text,
	`client_name` text,
	`quotation_number` text,
	`file_url` text,
	`amount` real,
	`currency` text DEFAULT 'SGD',
	`date` text,
	`status` text,
	`valid_until` text,
	`line_items` text,
	`metadata` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `business_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'customer' NOT NULL,
	`registration_no` text,
	`country` text,
	`address` text,
	`contact` text,
	`item_description` text,
	`date_create` text,
	`project_related` text,
	`currency` text DEFAULT 'SGD',
	`gst_reg_no` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`contact` text,
	`gst_reg_no` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `partner_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`name` text NOT NULL,
	`phone_email` text,
	`wechat` text,
	`position` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`partner_id`) REFERENCES `business_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `partner_customer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`credit_limit` text,
	`billing_terms` text,
	`customer_tier` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`partner_id`) REFERENCES `business_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `partner_supplier_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL,
	`payment_terms` text,
	`preferred_currency` text DEFAULT 'SGD',
	`supplier_category` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`partner_id`) REFERENCES `business_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`actor_email` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`project_id` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `company_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `upload_file_dedup` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`project_scope` text NOT NULL,
	`file_hash` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upload_file_dedup_hash_unique` ON `upload_file_dedup` (`domain`,`project_scope`,`file_hash`);--> statement-breakpoint
CREATE TABLE `upload_idempotency` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`endpoint` text NOT NULL,
	`user_id` text,
	`project_scope` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`response_body` text,
	`error_message` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upload_idempotency_key_unique` ON `upload_idempotency` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'owner' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `compensation_components` (
	`id` text PRIMARY KEY NOT NULL,
	`project_employee_id` text NOT NULL,
	`origin` text DEFAULT 'manual' NOT NULL,
	`employee_compensation_component_id` text,
	`label` text NOT NULL,
	`income_type` text NOT NULL,
	`rule_type` text NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`floor` real,
	`cap` real,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`taxable` integer DEFAULT true NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_employee_id`) REFERENCES `project_employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_compensation_component_id`) REFERENCES `employee_compensation_components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_compensation_components` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`label` text NOT NULL,
	`income_type` text NOT NULL,
	`rule_type` text NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`floor` real,
	`cap` real,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`taxable` integer DEFAULT true NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_project_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`project_id` text NOT NULL,
	`weight_pct` real NOT NULL,
	`allocation_mode` text DEFAULT 'manual' NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_salaries` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`month` text NOT NULL,
	`salary` real DEFAULT 0 NOT NULL,
	`allowance` real DEFAULT 0 NOT NULL,
	`cpf_employee` real DEFAULT 0 NOT NULL,
	`cpf_employer` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payout_records` (
	`id` text PRIMARY KEY NOT NULL,
	`component_id` text NOT NULL,
	`project_id` text NOT NULL,
	`period` text NOT NULL,
	`base_value` real DEFAULT 0 NOT NULL,
	`computed_amount` real DEFAULT 0 NOT NULL,
	`cpf_employee` real DEFAULT 0 NOT NULL,
	`cpf_employer` real DEFAULT 0 NOT NULL,
	`taxable_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source` text DEFAULT 'settlement' NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`component_id`) REFERENCES `compensation_components`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `business_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text,
	`project_id` text,
	`destination` text,
	`start_date` text,
	`end_date` text,
	`days` integer,
	`daily_allowance_rate` real,
	`status` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`uploaded_by` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
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
--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_system` text DEFAULT 'true' NOT NULL,
	`parent_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_categories_name_unique` ON `expense_categories` (`name`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`expense_type` text NOT NULL,
	`category` text NOT NULL,
	`doc_type` text,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`sgd_equivalent` real,
	`gst_amount` real DEFAULT 0,
	`vendor_or_supplier` text,
	`staff_name` text,
	`reimbursement` integer DEFAULT false NOT NULL,
	`business_trip` integer DEFAULT false NOT NULL,
	`destination` text,
	`document_ref` text,
	`metadata` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `revenue` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_type` text NOT NULL,
	`invoice_number` text,
	`client_name` text,
	`project_id` text,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`sgd_equivalent` real,
	`gst_amount` real DEFAULT 0,
	`document_ref` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employee_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`employment_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text,
	`end_date` text,
	`cpf_applicable` integer DEFAULT true NOT NULL,
	`tax_resident_label` text,
	`location` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text,
	`end_date` text,
	`contact` text,
	`tax_id` text,
	`cpf_applicable` integer DEFAULT true NOT NULL,
	`tax_resident_label` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `freelancer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`rate_type` text,
	`rate_amount` real,
	`currency` text DEFAULT 'SGD',
	`payment_terms` text,
	`business_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `person_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`role_type` text NOT NULL,
	`entity_id` text,
	`valid_from` text,
	`valid_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`tax_id` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `shareholder_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`share_percentage` real,
	`dividend_account` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`person_id` text,
	`name` text NOT NULL,
	`role` text,
	`staff_type` text DEFAULT 'fulltime' NOT NULL,
	`date_in` text,
	`date_out` text,
	`cpf_applicable` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`business_partner_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`type` text,
	`start_date` text,
	`end_date` text,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gst_returns` (
	`id` text PRIMARY KEY NOT NULL,
	`quarter` text NOT NULL,
	`year` text NOT NULL,
	`box_1` real DEFAULT 0 NOT NULL,
	`box_2` real DEFAULT 0 NOT NULL,
	`box_3` real DEFAULT 0 NOT NULL,
	`box_4` real DEFAULT 0 NOT NULL,
	`box_5` real DEFAULT 0 NOT NULL,
	`box_6` real DEFAULT 0 NOT NULL,
	`box_7` real DEFAULT 0 NOT NULL,
	`box_8` real DEFAULT 0 NOT NULL,
	`box_9` real DEFAULT 0 NOT NULL,
	`box_10` real DEFAULT 0 NOT NULL,
	`box_11` real DEFAULT 0 NOT NULL,
	`box_12` real DEFAULT 0 NOT NULL,
	`box_13` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`generated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `person_income` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`source` text NOT NULL,
	`source_id` text,
	`role_type` text,
	`income_type` text NOT NULL,
	`amount` real NOT NULL,
	`taxable_amount` real,
	`currency` text DEFAULT 'SGD' NOT NULL,
	`period` text,
	`project_id` text,
	`year_of_assessment` text,
	`tax_treatment` text DEFAULT 'taxable' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `time_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`project_id` text,
	`date` text NOT NULL,
	`hours` real NOT NULL,
	`description` text,
	`billable` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `document_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text DEFAULT 'default' NOT NULL,
	`source` text NOT NULL,
	`processing_status` text DEFAULT 'received' NOT NULL,
	`document_type` text,
	`original_file` text NOT NULL,
	`source_metadata` text,
	`text_extraction` text,
	`classification` text,
	`normalized_metadata` text,
	`security_flags` text,
	`size_bytes` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_uidx` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_uidx` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);