-- Migration 0012: Add attribution_type and person_id to expenses

ALTER TABLE `expenses` ADD COLUMN `attribution_type` text NOT NULL DEFAULT 'direct';
ALTER TABLE `expenses` ADD COLUMN `person_id` text;
