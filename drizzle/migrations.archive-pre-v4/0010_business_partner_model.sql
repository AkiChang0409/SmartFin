-- Migration 0010: BusinessPartner model (unified supplier + customer)
-- Introduces business_partners, partner_supplier_profiles, partner_customer_profiles

CREATE TABLE IF NOT EXISTS `business_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL DEFAULT 'customer',
	`registration_no` text,
	`country` text,
	`address` text,
	`contact` text,
	`currency` text DEFAULT 'SGD',
	`gst_reg_no` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE IF NOT EXISTS `partner_supplier_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL REFERENCES `business_partners`(`id`),
	`payment_terms` text,
	`preferred_currency` text DEFAULT 'SGD',
	`supplier_category` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE IF NOT EXISTS `partner_customer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text NOT NULL REFERENCES `business_partners`(`id`),
	`credit_limit` text,
	`billing_terms` text,
	`customer_tier` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

-- Data migration: copy existing customers into business_partners (preserve IDs)

INSERT INTO `business_partners` (`id`, `name`, `type`, `address`, `contact`, `gst_reg_no`, `metadata`, `created_at`, `updated_at`, `deleted_at`)
SELECT `id`, `name`, 'customer', `address`, `contact`, `gst_reg_no`, `metadata`, `created_at`, `updated_at`, `deleted_at`
FROM `customers`;

-- Create customer profile entries for migrated records

INSERT INTO `partner_customer_profiles` (`id`, `partner_id`, `created_at`, `updated_at`, `deleted_at`)
SELECT 'cp-' || `id`, `id`, `created_at`, `updated_at`, `deleted_at`
FROM `customers`;
