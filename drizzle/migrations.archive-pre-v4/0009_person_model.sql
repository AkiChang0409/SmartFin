-- Migration 0009: Person model (multi-role identity system)
-- Introduces persons, person_roles, employee_profiles, shareholder_profiles, freelancer_profiles

CREATE TABLE IF NOT EXISTS `persons` (
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

CREATE TABLE IF NOT EXISTS `person_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL REFERENCES `persons`(`id`),
	`role_type` text NOT NULL,
	`entity_id` text,
	`valid_from` text,
	`valid_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE IF NOT EXISTS `employee_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL REFERENCES `persons`(`id`),
	`employment_type` text NOT NULL,
	`status` text NOT NULL DEFAULT 'active',
	`start_date` text,
	`end_date` text,
	`cpf_applicable` integer NOT NULL DEFAULT true,
	`tax_resident_label` text,
	`location` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE IF NOT EXISTS `shareholder_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL REFERENCES `persons`(`id`),
	`share_percentage` real,
	`dividend_account` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

CREATE TABLE IF NOT EXISTS `freelancer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL REFERENCES `persons`(`id`),
	`rate_type` text,
	`rate_amount` real,
	`currency` text DEFAULT 'SGD',
	`payment_terms` text,
	`business_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);

-- Data migration: copy existing employees into persons + person_roles + employee_profiles
-- Using the SAME id from employees as the persons.id for FK continuity

INSERT INTO `persons` (`id`, `name`, `email`, `phone`, `tax_id`, `metadata`, `created_at`, `updated_at`, `deleted_at`)
SELECT `id`, `name`, `contact`, NULL, `tax_id`, `metadata`, `created_at`, `updated_at`, `deleted_at`
FROM `employees`;

INSERT INTO `person_roles` (`id`, `person_id`, `role_type`, `valid_from`, `created_at`, `updated_at`, `deleted_at`)
SELECT 'role-' || `id`, `id`, 'employee', `start_date`, `created_at`, `updated_at`, `deleted_at`
FROM `employees`;

INSERT INTO `employee_profiles` (`id`, `person_id`, `employment_type`, `status`, `start_date`, `end_date`, `cpf_applicable`, `tax_resident_label`, `created_at`, `updated_at`, `deleted_at`)
SELECT 'ep-' || `id`, `id`, `type`, `status`, `start_date`, `end_date`, `cpf_applicable`, `tax_resident_label`, `created_at`, `updated_at`, `deleted_at`
FROM `employees`;
