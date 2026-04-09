import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { timeFields } from '../schema-helpers';
import { projects } from '../project/schema';
import { customers } from '../business-partner/schema';

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export const contracts = sqliteTable('contracts', {
	id: text('id').primaryKey(),
	projectId: text('project_id').references(() => projects.id),
	businessPartnerId: text('business_partner_id'),
	type: text('type', { enum: ['customer_contract', 'supplier_contract'] }),
	fileUrl: text('file_url').notNull(),
	amount: real('amount'),
	currency: text('currency').default('SGD'),
	date: text('date'),
	status: text('status', {
		enum: ['draft', 'active', 'completed', 'terminated']
	}),
	paymentTerms: text('payment_terms'),
	metadata: text('metadata'),
	...timeFields
});

// ---------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------

export const quotations = sqliteTable('quotations', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id),
	businessPartnerId: text('business_partner_id'),
	sourceType: text('source_type'),
	fileUrl: text('file_url'),
	amount: real('amount'),
	currency: text('currency').default('SGD'),
	date: text('date'),
	status: text('status', {
		enum: ['draft', 'sent', 'accepted', 'rejected', 'expired']
	}),
	validUntil: text('valid_until'),
	lineItems: text('line_items'),
	metadata: text('metadata'),
	...timeFields
});

// ---------------------------------------------------------------------------
// Invoices Out (customer invoices)
// ---------------------------------------------------------------------------

export const invoicesOut = sqliteTable('invoices_out', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id),
	customerId: text('customer_id')
		.notNull()
		.references(() => customers.id),
	businessPartnerId: text('business_partner_id'),
	invoiceNo: text('invoice_no').notNull().unique(),
	date: text('date').notNull(),
	dueDate: text('due_date'),
	currency: text('currency').notNull().default('SGD'),
	subtotal: real('subtotal').notNull().default(0),
	gstType: text('gst_type', { enum: ['standard', 'zero', 'exempt'] })
		.notNull()
		.default('standard'),
	gstAmount: real('gst_amount').notNull().default(0),
	total: real('total').notNull().default(0),
	status: text('status').notNull().default('draft'),
	pdfUrl: text('pdf_url'),
	lineItems: text('line_items'),
	...timeFields
});

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------

export const purchaseOrders = sqliteTable('purchase_orders', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id),
	businessPartnerId: text('business_partner_id'),
	poNumber: text('po_number').notNull().unique(),
	fileUrl: text('file_url'),
	supplierName: text('supplier_name'),
	amount: real('amount'),
	currency: text('currency').default('SGD'),
	date: text('date'),
	status: text('status', {
		enum: ['draft', 'sent', 'confirmed', 'fulfilled']
	}),
	lineItems: text('line_items'),
	metadata: text('metadata'),
	...timeFields
});

// ---------------------------------------------------------------------------
// Invoices In (supplier invoices)
// ---------------------------------------------------------------------------

export const invoicesIn = sqliteTable('invoices_in', {
	id: text('id').primaryKey(),
	projectId: text('project_id')
		.notNull()
		.references(() => projects.id),
	poId: text('po_id').references(() => purchaseOrders.id),
	businessPartnerId: text('business_partner_id'),
	supplierName: text('supplier_name'),
	invoiceDate: text('invoice_date'),
	amount: real('amount').notNull().default(0),
	currency: text('currency').notNull().default('SGD'),
	gstAmount: real('gst_amount').notNull().default(0),
	dueDate: text('due_date'),
	poNumber: text('po_number'),
	status: text('status').notNull().default('pending_review'),
	fileUrl: text('file_url').notNull(),
	ocrConfidence: real('ocr_confidence'),
	rawOcr: text('raw_ocr'),
	...timeFields
});

// ---------------------------------------------------------------------------
// Payments (NEW — tracks money in/out)
// ---------------------------------------------------------------------------

export const payments = sqliteTable('payments', {
	id: text('id').primaryKey(),
	direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
	businessPartnerId: text('business_partner_id'),
	projectId: text('project_id').references(() => projects.id),
	/** Linked invoice (customer or supplier) */
	invoiceId: text('invoice_id'),
	invoiceType: text('invoice_type', { enum: ['customer', 'supplier'] }),
	amount: real('amount').notNull(),
	currency: text('currency').notNull().default('SGD'),
	paymentDate: text('payment_date').notNull(),
	method: text('method', {
		enum: ['bank_transfer', 'cheque', 'cash', 'credit_card', 'other']
	}),
	reference: text('reference'),
	status: text('status', { enum: ['pending', 'completed', 'failed'] })
		.notNull()
		.default('pending'),
	note: text('note'),
	...timeFields
});

// ---------------------------------------------------------------------------
// ARDocumentLink (flexible document-to-document linking)
// ---------------------------------------------------------------------------

export const arDocumentLinks = sqliteTable('ar_document_links', {
	id: text('id').primaryKey(),
	fromType: text('from_type', {
		enum: ['quotation', 'contract', 'purchase_order', 'customer_invoice', 'supplier_invoice', 'payment']
	}).notNull(),
	fromId: text('from_id').notNull(),
	toType: text('to_type', {
		enum: ['quotation', 'contract', 'purchase_order', 'customer_invoice', 'supplier_invoice', 'payment']
	}).notNull(),
	toId: text('to_id').notNull(),
	linkType: text('link_type', {
		enum: ['derived_from', 'replaces', 'partial_fulfills', 'fulfills', 'amends']
	}).notNull(),
	...timeFields
});
