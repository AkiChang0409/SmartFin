import type { CategoryChoice, DocumentArtifactView } from './types';

export type FieldKind = 'text' | 'number' | 'date' | 'checkbox' | 'textarea';
export type Draft = Record<string, string | boolean>;

interface FieldMeta {
	label: string;
	kind: FieldKind;
	aliases?: string[];
	defaultValue?: string | boolean;
}

const FIELD_META: Record<string, FieldMeta> = {
	invoice_number: { label: 'Invoice number', kind: 'text', aliases: ['documentNumber', 'invoiceNumber'] },
	receipt_number: { label: 'Receipt number', kind: 'text', aliases: ['documentNumber', 'receiptNumber'] },
	po_number: { label: 'PO number', kind: 'text', aliases: ['documentNumber', 'poNumber'] },
	contract_number: { label: 'Contract number', kind: 'text', aliases: ['documentNumber', 'contractNumber'] },
	quotation_number: { label: 'Quotation number', kind: 'text', aliases: ['documentNumber', 'quotationNumber'] },
	supplier_name: { label: 'Supplier', kind: 'text', aliases: ['counterpartyName', 'supplierName'] },
	vendor: { label: 'Vendor', kind: 'text', aliases: ['counterpartyName', 'vendor'] },
	recipient_name: { label: 'Recipient', kind: 'text', aliases: ['recipientName', 'counterpartyName'] },
	staff_name: { label: 'Staff name', kind: 'text', aliases: ['staffName'] },
	customer_name: { label: 'Customer', kind: 'text', aliases: ['counterpartyName', 'customerName'] },
	client_name: { label: 'Client', kind: 'text', aliases: ['counterpartyName', 'clientName'] },
	date: { label: 'Date', kind: 'date', aliases: ['issueDate', 'date'] },
	due_date: { label: 'Due date', kind: 'date', aliases: ['dueDate'] },
	effective_date: { label: 'Effective date', kind: 'date', aliases: ['effectiveDate'] },
	expiry_date: { label: 'Expiry date', kind: 'date', aliases: ['expiryDate'] },
	valid_until: { label: 'Valid until', kind: 'date', aliases: ['validUntil'] },
	invoice_date: { label: 'Invoice date', kind: 'date', aliases: ['issueDate', 'invoiceDate'] },
	invoice_due_date: { label: 'Invoice due date', kind: 'date', aliases: ['dueDate', 'invoiceDueDate'] },
	amount: { label: 'Amount', kind: 'number', aliases: ['totalAmount', 'amount'] },
	total: { label: 'Total', kind: 'number', aliases: ['totalAmount', 'total'] },
	gst_amount: { label: 'GST amount', kind: 'number', aliases: ['gstAmount'] },
	invoice_amount: { label: 'Invoice amount', kind: 'number', aliases: ['totalAmount', 'invoiceAmount'] },
	invoice_gst_amount: { label: 'Invoice GST amount', kind: 'number', aliases: ['gstAmount', 'invoiceGstAmount'] },
	invoice_subtotal: { label: 'Invoice subtotal', kind: 'number', aliases: ['subtotal', 'invoiceSubtotal'] },
	currency: { label: 'Currency', kind: 'text', aliases: ['currency'], defaultValue: 'SGD' },
	invoice_currency: { label: 'Invoice currency', kind: 'text', aliases: ['currency', 'invoiceCurrency'], defaultValue: 'SGD' },
	destination: { label: 'Destination', kind: 'text' },
	service_name: { label: 'Service name', kind: 'text', aliases: ['serviceName'] },
	period: { label: 'Period', kind: 'text' },
	tracking_number: { label: 'Tracking number', kind: 'text', aliases: ['trackingNumber'] },
	description: { label: 'Description', kind: 'textarea' },
	scope: { label: 'Scope', kind: 'textarea' },
	payment_terms: { label: 'Payment terms', kind: 'textarea', aliases: ['paymentTerms'] },
	line_items: { label: 'Line items', kind: 'textarea', aliases: ['lineItems', 'invoiceLineItems'] },
	reimbursement: { label: 'Reimbursement', kind: 'checkbox', defaultValue: false },
	business_trip: { label: 'Business trip', kind: 'checkbox', aliases: ['businessTrip'], defaultValue: false },
	date_start: { label: 'Start date', kind: 'date', aliases: ['dateStart'] },
	date_end: { label: 'End date', kind: 'date', aliases: ['dateEnd'] },
	days: { label: 'Days', kind: 'number' },
	daily_rate: { label: 'Daily rate', kind: 'number', aliases: ['dailyRate'] },
	invoice_type: { label: 'Invoice type', kind: 'text', defaultValue: 'standard' },
	type: { label: 'Type', kind: 'text' },
	status: { label: 'Status', kind: 'text', defaultValue: 'active' },
	notes: { label: 'Notes', kind: 'textarea' }
};

export function uniqueFields(category: CategoryChoice | null): string[] {
	if (!category) return [];
	return [...new Set([...category.llmFields, ...category.userFields])];
}

export function editableFields(category: CategoryChoice | null): string[] {
	return uniqueFields(category).filter((key) => key !== 'project_id' && key !== 'projectId');
}

export function fieldMeta(key: string): FieldMeta {
	return (
		FIELD_META[key] ?? {
			label: key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			kind: 'text'
		}
	);
}

function suggestedValue(artifact: DocumentArtifactView, key: string): unknown {
	const fields = artifact.suggestedFields?.fields ?? {};
	const aliases = [key, ...(fieldMeta(key).aliases ?? [])];
	for (const alias of aliases) {
		if (fields[alias] !== undefined && fields[alias] !== null) return fields[alias];
	}
	return undefined;
}

export function confidenceFor(artifact: DocumentArtifactView, key: string): number | undefined {
	const confidence = artifact.suggestedFields?.confidence ?? {};
	const aliases = [key, ...(fieldMeta(key).aliases ?? [])];
	for (const alias of aliases) {
		if (confidence[alias] != null) return confidence[alias];
	}
	return undefined;
}

function defaultFor(key: string, category: CategoryChoice | null): string | boolean {
	if (key === 'reimbursement') {
		const id = category?.id ?? '';
		return id.includes('transport') || id.includes('meal') || id.includes('accommodation');
	}
	if (key === 'business_trip') return category?.id.includes('accommodation') ?? false;
	const meta = fieldMeta(key);
	if (meta.defaultValue !== undefined) return meta.defaultValue;
	return meta.kind === 'checkbox' ? false : '';
}

export function initialDraftFor(artifact: DocumentArtifactView, category: CategoryChoice | null): Draft {
	const draft: Draft = {};
	for (const key of uniqueFields(category)) {
		const meta = fieldMeta(key);
		const confidence = confidenceFor(artifact, key);
		const value = confidence != null && confidence < 0.5 ? undefined : suggestedValue(artifact, key);
		if (meta.kind === 'checkbox') {
			draft[key] = typeof value === 'boolean' ? value : Boolean(defaultFor(key, category));
		} else if (Array.isArray(value)) {
			draft[key] = value.map((item) => JSON.stringify(item)).join('\n');
		} else if (typeof value === 'number') {
			draft[key] = String(value);
		} else if (typeof value === 'string') {
			draft[key] = value;
		} else {
			draft[key] = defaultFor(key, category) as string;
		}
	}
	return draft;
}

export function projectValueFromDraft(draft: Draft): string {
	const value = draft.project_id ?? draft.projectId;
	return typeof value === 'string' ? value : '';
}

export function coerceDraftValue(key: string, value: string | boolean | undefined): unknown {
	const meta = fieldMeta(key);
	if (meta.kind === 'checkbox') return Boolean(value);
	if (meta.kind === 'number') {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return typeof value === 'string' ? value.trim() : value ?? '';
}
