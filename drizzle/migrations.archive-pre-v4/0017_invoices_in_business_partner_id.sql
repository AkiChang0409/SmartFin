-- Align `invoices_in` with `src/lib/server/modules/ar/schema.ts` (optional supplier BP link).
ALTER TABLE `invoices_in` ADD COLUMN `business_partner_id` text;
