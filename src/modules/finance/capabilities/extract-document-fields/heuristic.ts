/**
 * Pure-function heuristic extractors per document type.
 *
 * Phase 3 generalization of `extract-invoice-fields/heuristic.ts`. Splits
 * the regex pass into three branches keyed by `categoryDocType`. Each branch
 * targets the OCR shapes SmartFin sees in practice (SG SMB invoices,
 * Workers AI vision OCR transcripts, PDF text-layer dumps).
 *
 * Common output shape: `HeuristicResult` carries the normalized
 * `ExtractedInvoiceFields`-compatible projection so downstream matching/
 * confirmation steps don't have to fork.
 */

import type { CategoryDocType } from '../../workflows/financial-document-intake/categories';

export interface HeuristicCommonFields {
	/** Best-effort document number — invoice/receipt/po. */
	documentNumber: string | null;
	supplierName: string | null;
	/** Document issue / transaction date (YYYY-MM-DD). */
	issueDate: string | null;
	/** Due date (invoices only). */
	dueDate: string | null;
	totalAmount: number | null;
	/** GST / tax amount (invoices, sales_cost.receipt). */
	gstAmount: number | null;
	currency: string | null;
	/** Receipt-specific. */
	recipientName: string | null;
	/** PO description, accommodation destination, etc. */
	description: string | null;
	/** Logistics tracking number. */
	trackingNumber: string | null;
}

export interface HeuristicResult {
	fields: HeuristicCommonFields;
	filledCount: number;
	confidence: number;
}

const DATE_RE = /(\d{4}-\d{2}-\d{2})/;
const CURRENCY_RE = /\b(SGD|USD|CNY|MYR|EUR|HKD|GBP|JPY)\b/i;
const SUPPLIER_BLOCKLIST = /^(invoice|tax\s*invoice|bill|receipt|statement|purchase\s*order)$/i;

function pickFirst(text: string, ...patterns: RegExp[]): string | null {
	for (const re of patterns) {
		const m = text.match(re);
		if (m?.[1]) return m[1].trim();
	}
	return null;
}

function pickAmount(text: string, ...patterns: RegExp[]): number | null {
	for (const re of patterns) {
		const m = text.match(re);
		if (m?.[1]) {
			const v = Number.parseFloat(m[1].replace(/,/g, ''));
			if (Number.isFinite(v)) return v;
		}
	}
	return null;
}

function pickFirstLineName(text: string): string | null {
	const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	for (const line of lines.slice(0, 8)) {
		if (line.length < 3 || line.length > 80) continue;
		if (SUPPLIER_BLOCKLIST.test(line)) continue;
		if (/[a-zA-Z]/.test(line) && !DATE_RE.test(line)) return line;
	}
	return null;
}

function pickCurrency(text: string): string | null {
	const m = text.match(CURRENCY_RE);
	return m ? m[1].toUpperCase() : null;
}

// ---------------------------------------------------------------------------
// Invoice heuristic
// ---------------------------------------------------------------------------

function extractInvoice(text: string): HeuristicCommonFields {
	const supplierName = pickFirstLineName(text);
	const documentNumber = pickFirst(
		text,
		/\b(INV-\d{2,}[-_]?\d{2,4})\b/i,
		/\binvoice\s*(?:no\.?|number|#|:)\s*([A-Z][A-Z0-9-]{3,})/i,
		/\b(?:tax\s+)?invoice\s+([A-Z][A-Z0-9-]{4,})/i,
		/\b([A-Z]{2,4}-\d{4}-Q?\d-\d{3,4})\b/,
		/\b([A-Z]{2,4}-\d{4}-\d{3,4})\b/
	);
	const issueDate = pickFirst(
		text,
		/issue\s*date[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/issued\s*on[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/issue[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/date\s*issued[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/invoice\s*date[:\s]+(\d{4}-\d{2}-\d{2})/i
	);
	const dueDate = pickFirst(
		text,
		/due\s*date[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/payment\s*due[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/due[:\s]+(\d{4}-\d{2}-\d{2})/i
	);
	const totalAmount = pickAmount(
		text,
		/\btotal\s*payable[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\btotal[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bamount\s*due[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bgrand\s*total[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i
	);
	const gstAmount = pickAmount(
		text,
		/\bgst\s*\d+%[:\s]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bgst\s*\(\d+%\)[:\s]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bgst\s*amount[:\s]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bgst[:\s]+([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\btax[:\s]+([0-9][0-9,]*(?:\.[0-9]{1,2}))/i
	);
	return {
		documentNumber,
		supplierName,
		issueDate,
		dueDate,
		totalAmount,
		gstAmount,
		currency: pickCurrency(text),
		recipientName: null,
		description: null,
		trackingNumber: null
	};
}

// ---------------------------------------------------------------------------
// Receipt heuristic
// ---------------------------------------------------------------------------

function extractReceipt(text: string): HeuristicCommonFields {
	const supplierName = pickFirstLineName(text);
	const documentNumber = pickFirst(
		text,
		/\breceipt\s*(?:no\.?|number|#)\s*[:\s]*([A-Z0-9-]{3,})/i,
		/\btransaction\s*(?:ref|id|no)\s*[:\s#]*([A-Z0-9-]{3,})/i,
		/\btill\s*no\s*[:\s#]*([A-Z0-9-]{3,})/i,
		/\b((?:REC|RCT|RECPT)-\d{2,}[-_]?\d{2,4})\b/i
	);
	const issueDate = pickFirst(
		text,
		/\bdate[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/\bdate\s*issued[:\s]+(\d{4}-\d{2}-\d{2})/i,
		DATE_RE
	);
	const totalAmount = pickAmount(
		text,
		/\btotal[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bamount[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bsubtotal[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i
	);
	const gstAmount = pickAmount(
		text,
		/\bgst\s*\d*%?[:\s]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\btax[:\s]+([0-9][0-9,]*(?:\.[0-9]{1,2}))/i
	);
	const recipientName = pickFirst(
		text,
		/\bstaff\s*(?:name)?[:\s]+([A-Z][A-Za-z\s.'-]{2,40})/i,
		/\bsigned\s*by[:\s]+([A-Z][A-Za-z\s.'-]{2,40})/i
	);
	const trackingNumber = pickFirst(
		text,
		/\btracking\s*(?:no\.?|number|#|:)\s*([A-Z0-9-]{6,})/i,
		/\bawb[:\s#]+([A-Z0-9-]{6,})/i
	);
	return {
		documentNumber,
		supplierName,
		issueDate,
		dueDate: null,
		totalAmount,
		gstAmount,
		currency: pickCurrency(text),
		recipientName,
		description: null,
		trackingNumber
	};
}

// ---------------------------------------------------------------------------
// Purchase order heuristic
// ---------------------------------------------------------------------------

function extractPO(text: string): HeuristicCommonFields {
	const supplierName = pickFirstLineName(text);
	const documentNumber = pickFirst(
		text,
		/\bpurchase\s*order\s*(?:no\.?|number|#|:)\s*([A-Z0-9-]{3,})/i,
		/\bp\.?o\.?\s*(?:no\.?|number|#|:)\s*([A-Z0-9-]{3,})/i,
		/\b(PO-\d{2,}[-_]?\d{2,4})\b/i
	);
	const issueDate = pickFirst(
		text,
		/\bissue\s*date[:\s]+(\d{4}-\d{2}-\d{2})/i,
		/\bdate[:\s]+(\d{4}-\d{2}-\d{2})/i,
		DATE_RE
	);
	const totalAmount = pickAmount(
		text,
		/\btotal[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\bgrand\s*total[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i,
		/\border\s*total[:\s$]*([0-9][0-9,]*(?:\.[0-9]{1,2}))/i
	);
	const description = pickFirst(
		text,
		/\bdescription[:\s]+([^\n]{4,80})/i,
		/\bitem[:\s]+([^\n]{4,80})/i
	);
	return {
		documentNumber,
		supplierName,
		issueDate,
		dueDate: null,
		totalAmount,
		gstAmount: null,
		currency: pickCurrency(text),
		recipientName: null,
		description,
		trackingNumber: null
	};
}

// ---------------------------------------------------------------------------
// Public dispatch
// ---------------------------------------------------------------------------

function scoreFilled(fields: HeuristicCommonFields): {
	filled: number;
	confidence: number;
} {
	const filled = Object.values(fields).filter((v) => v !== null && v !== undefined).length;
	let confidence = 0.1;
	if (filled >= 6) confidence = 0.88;
	else if (filled >= 4) confidence = 0.7;
	else if (filled >= 2) confidence = 0.4;
	return { filled, confidence };
}

export function runHeuristicExtraction(
	rawText: string,
	docType: CategoryDocType
): HeuristicResult {
	let fields: HeuristicCommonFields;
	if (docType === 'invoice' || docType === 'invoice_out') fields = extractInvoice(rawText);
	else if (docType === 'po' || docType === 'purchase_order_doc') fields = extractPO(rawText);
	else fields = extractReceipt(rawText);

	const { filled, confidence } = scoreFilled(fields);
	return { fields, filledCount: filled, confidence };
}
