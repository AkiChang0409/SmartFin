/**
 * Category-driven extraction router — Strategy B of the intake pipeline:
 * "先分类后抽取". Given the classifier's (bucket, docType, category) or
 * the user's forced override, pick the extractor whose prompt fits.
 */

import type { Bucket, ExtractedFields } from './types';
import { extractInvoice } from './extractors/invoice-shape';
import { extractReceipt, type ReceiptVariant } from './extractors/receipt-shape';
import { extractContract, extractQuotation, extractPo } from './extractors/doc-hub';
import { extractGeneric } from './extractors/generic';

export interface ExtractArgs {
	rawText: string;
	bucket: Bucket;
	docType: string;
	category: string | null;
	env: Env;
}

const RECEIPT_CATEGORIES: ReadonlySet<string> = new Set([
	'transport',
	'meal',
	'accommodation',
	'gift',
	'logistics',
	'others'
]);

export async function extractByCategory(args: ExtractArgs): Promise<Partial<ExtractedFields>> {
	const { rawText, bucket, docType, category, env } = args;

	// --- Revenue ---------------------------------------------------------
	if (bucket === 'revenue') {
		return extractInvoice(rawText, 'revenue', env);
	}

	// --- Expense — category decides the extractor shape ------------------
	if (bucket === 'expense') {
		if (category === 'invoice') return extractInvoice(rawText, 'sales_cost', env);
		if (category === 'ai_subscription') return extractInvoice(rawText, 'ai_subscription', env);
		if (category === 'receipt') return extractReceipt(rawText, 'sales_cost', env);
		if (category === 'purchase') return extractPo(rawText, env);
		if (category === 'allowance') return extractGeneric(rawText);
		if (category && RECEIPT_CATEGORIES.has(category)) {
			return extractReceipt(rawText, category as ReceiptVariant, env);
		}
		// Unknown / missing expense category — treat as generic receipt
		return extractReceipt(rawText, 'others', env);
	}

	// --- Document only — docType decides the extractor -------------------
	if (docType === 'contract') return extractContract(rawText, env);
	if (docType === 'quotation') return extractQuotation(rawText, env);
	if (docType === 'purchase_order') return extractPo(rawText, env);

	// 'other' / unknown
	return extractGeneric(rawText);
}
