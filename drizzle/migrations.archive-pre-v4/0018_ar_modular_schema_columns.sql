-- Modular AR / business-partner alignment: columns present in Drizzle (`ar/schema.ts`, `project/schema.ts`)
-- but never added after initial `0000` / `0003` (contracts). Safe to run once; re-run skipped by D1 migration ledger.

-- contracts (0003 made project_id nullable; BP + lifecycle fields added in code only)
ALTER TABLE `contracts` ADD COLUMN `business_partner_id` text;
ALTER TABLE `contracts` ADD COLUMN `type` text;
ALTER TABLE `contracts` ADD COLUMN `status` text;
ALTER TABLE `contracts` ADD COLUMN `payment_terms` text;

-- customer invoices
ALTER TABLE `invoices_out` ADD COLUMN `business_partner_id` text;

-- quotations
ALTER TABLE `quotations` ADD COLUMN `business_partner_id` text;
ALTER TABLE `quotations` ADD COLUMN `status` text;
ALTER TABLE `quotations` ADD COLUMN `valid_until` text;
ALTER TABLE `quotations` ADD COLUMN `line_items` text;

-- purchase orders (metadata added in 0002; BP + status + line items in code only)
ALTER TABLE `purchase_orders` ADD COLUMN `business_partner_id` text;
ALTER TABLE `purchase_orders` ADD COLUMN `status` text;
ALTER TABLE `purchase_orders` ADD COLUMN `line_items` text;
