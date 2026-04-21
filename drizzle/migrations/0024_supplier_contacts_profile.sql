ALTER TABLE `business_partners` ADD COLUMN `item_description` text;
ALTER TABLE `business_partners` ADD COLUMN `date_create` text;
ALTER TABLE `business_partners` ADD COLUMN `project_related` text;

CREATE TABLE IF NOT EXISTS `partner_contacts` (
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
CREATE INDEX IF NOT EXISTS `partner_contacts_partner_idx` ON `partner_contacts` (`partner_id`);
