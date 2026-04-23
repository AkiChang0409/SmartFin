/**
 * Narration builder — turns the classified triple + extracted fields
 * into one user-facing sentence the panel shows at the top of ReviewStep.
 *
 * Vision doc §5.7 tone: "professional, reliable, slightly witty senior
 * colleague" — short, concrete, no emoji, no system-speak.
 */

import type { Bucket, ExtractedFields, ProjectMatch } from './types';

export interface NarrationArgs {
	bucket: Bucket;
	docType: string;
	category: string | null;
	fields: Partial<ExtractedFields>;
	topProject: ProjectMatch | null;
}

const EXPENSE_LABEL: Record<string, string> = {
	ai_subscription: 'SaaS subscription',
	transport: 'Transport',
	accommodation: 'Accommodation',
	meal: 'Meal',
	logistics: 'Logistics charge',
	purchase: 'Purchase',
	allowance: 'Allowance',
	gift: 'Gift',
	invoice: 'Supplier invoice',
	receipt: 'Payment receipt',
	others: 'Expense'
};

export function buildNarration(args: NarrationArgs): string {
	const { bucket, docType, category, fields, topProject } = args;
	const currency = fields.currency ?? 'SGD';
	const amount = fields.totalAmount;
	const amountStr = amount ? `, ${currency} ${Number(amount).toLocaleString('en-SG')}` : '';
	const project = topProject?.name ? ` → ${topProject.name}` : '';

	if (bucket === 'revenue') {
		const who = fields.clientName ?? 'a customer';
		return `Customer invoice for ${who}${amountStr}${project}`;
	}

	if (bucket === 'expense') {
		const supplier = fields.supplierName ?? 'a supplier';
		const label = (category && EXPENSE_LABEL[category]) ?? 'Expense';
		return `${label} from ${supplier}${amountStr}${project}`;
	}

	if (docType === 'contract') {
		const cp = fields.clientName ?? 'counterparty';
		const eff = fields.effectiveDate ? ` from ${fields.effectiveDate}` : '';
		return `Contract with ${cp}${eff}`;
	}
	if (docType === 'quotation') {
		const num = fields.quotationNumber ?? '?';
		return `Quotation #${num}${amountStr}`;
	}
	if (docType === 'purchase_order') {
		const num = fields.poNumber ?? '?';
		return `Purchase order #${num}${amountStr}`;
	}

	return 'Archive document';
}
