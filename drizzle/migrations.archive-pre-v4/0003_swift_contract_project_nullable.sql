PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`file_url` text NOT NULL,
	`amount` real,
	`currency` text DEFAULT 'SGD',
	`date` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `__new_contracts` (
	`id`,
	`project_id`,
	`file_url`,
	`amount`,
	`currency`,
	`date`,
	`metadata`,
	`created_at`,
	`updated_at`,
	`deleted_at`
)
SELECT
	`id`,
	`project_id`,
	`file_url`,
	`amount`,
	`currency`,
	`date`,
	`metadata`,
	`created_at`,
	`updated_at`,
	`deleted_at`
FROM `contracts`;

DROP TABLE `contracts`;
ALTER TABLE `__new_contracts` RENAME TO `contracts`;

PRAGMA foreign_keys=ON;
