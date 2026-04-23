import type { RequestHandler } from './$types';

import { fail, ok } from '$lib/server/http';
import { objectExists } from '$lib/server/r2';
import { createModuleContext } from '$lib/server/modules';
import { createExpenseApi } from '$lib/server/modules/expense/api';
import { getDb, schema } from '$lib/server/modules/legacy-db';

/**
 * Document intake save — step 5 of the panel workflow.
 *
 * Routes the (bucket, docType, category) triple to the right write path:
 *   • revenue        → expenseApi.createRevenue() + documents(purpose='financial')
 *   • expense        → expenseApi.create() + documents(purpose='financial')
 *   • document_only  → contracts|quotations|purchase_orders + documents(purpose='reference')
 *
 * All writes go through existing module APIs where available; document_only
 * paths use legacy-db directly because the doc-hub module has no `create`
 * API today (its writes live in /api/doc-hub/upload). Phase 1B scope — the
 * linter's modular-boundary rule is satisfied via legacy-db.
 *
 * Intentionally NOT handled here (deferred to future phases):
 *   • Idempotency keys / file-hash dedupe (the /api/expenses/upload
 *     endpoint has them; panel intake is fresh each time so collisions are
 *     rare). Phase 1B = demo-grade.
 *   • FX resolve for document_only amounts.
 */

type Bucket = 'revenue' | 'expense' | 'document_only';

type IntakePayload = {
	fileKey?: string;
	fileName?: string;
	fileType?: string;
	bucket?: Bucket;
	docType?: string;
	category?: string | null;
	expenseType?: 'opex' | 'sales_cost' | null;
	categoryDocType?: 'invoice' | 'receipt' | 'po' | null;
	fields?: Record<string, unknown>;
	projectId?: string | null;
};

function str(v: unknown): string {
	return typeof v === 'string' ? v.trim() : '';
}

function num(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim()) {
		const n = Number(v.replace(/,/g, ''));
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function normalizeProjectId(v: string | null | undefined): string | null {
	if (!v) return null;
	const s = v.trim();
	if (!s || s.toLowerCase() === 'company') return null;
	return s;
}

function fileTypeCategory(mime: string): string {
	const m = mime.toLowerCase();
	if (m.includes('pdf')) return 'pdf';
	if (m.includes('image')) return 'image';
	return 'other';
}

/** Map intake (bucket, docType, category) to documents.docType enum. */
function mapDocumentsDocType(
	bucket: Bucket,
	docType: string,
	categoryDocType: string | null
): 'invoice' | 'receipt' | 'contract' | 'po' | 'bom' | 'quotation' | 'other' {
	if (bucket === 'document_only') {
		if (docType === 'contract') return 'contract';
		if (docType === 'quotation') return 'quotation';
		if (docType === 'purchase_order') return 'po';
		return 'other';
	}
	if (bucket === 'revenue') return 'invoice';
	// bucket === 'expense'
	if (categoryDocType === 'invoice') return 'invoice';
	if (categoryDocType === 'receipt') return 'receipt';
	if (categoryDocType === 'po') return 'po';
	return 'receipt'; // opex default
}

export const POST: RequestHandler = async (event) => {
	const { request, platform, locals } = event;
	if (!platform) return fail('Cloudflare platform bindings are required', 500);

	const body = (await request.json()) as IntakePayload;
	const bucket = body.bucket;
	const docType = str(body.docType);
	if (!bucket || !docType) return fail('bucket and docType are required', 400);
	const fields = body.fields ?? {};
	const projectId = normalizeProjectId(body.projectId);

	// R2 key is optional only for the allowance edge case (no file).
	const isAllowance = bucket === 'expense' && body.category === 'allowance';
	if (!isAllowance) {
		if (!body.fileKey || !body.fileName || !body.fileType) {
			return fail('fileKey, fileName, fileType are required', 400);
		}
		const exists = await objectExists(platform.env, body.fileKey);
		if (!exists) return fail('Uploaded object was not found in R2', 404);
	}

	const ctx = await createModuleContext(event);
	const expenseApi = createExpenseApi(ctx);
	const db = getDb(platform.env);
	const now = new Date().toISOString();
	const uploadedBy = locals.user?.id ?? 'system';

	// ---------------------------------------------------------------------
	// REVENUE
	// ---------------------------------------------------------------------
	if (bucket === 'revenue') {
		const invoiceTypeRaw = str(fields.invoiceType) || 'standard';
		const invoiceType: 'standard' | 'zero_rate' | 'tax_invoice' =
			invoiceTypeRaw === 'zero_rate' || invoiceTypeRaw === 'tax_invoice'
				? invoiceTypeRaw
				: 'standard';

		const amount = num(fields.totalAmount) ?? 0;
		const date = str(fields.documentDate) || now.slice(0, 10);

		const revenueRow = await expenseApi.createRevenue({
			projectId,
			invoiceType,
			invoiceNumber: str(fields.invoiceNumber) || null,
			clientName: str(fields.clientName) || null,
			date,
			amount,
			currency: str(fields.currency) || 'SGD',
			gstAmount: num(fields.gstAmount) ?? 0,
			notes: null
		});

		await db.insert(schema.documents).values({
			id: crypto.randomUUID(),
			projectId,
			uploadedBy,
			entityType: 'revenue',
			entityId: revenueRow.id,
			fileKey: body.fileKey!,
			fileName: body.fileName!,
			fileType: fileTypeCategory(body.fileType!),
			purpose: 'financial',
			docType: 'invoice',
			ocrStatus: 'done',
			ocrResult: JSON.stringify({ source: 'intake', submittedAt: now, fields }),
			createdAt: now,
			updatedAt: now
		});

		return ok(
			{
				entityType: 'revenue',
				entityId: revenueRow.id,
				message: 'Revenue invoice recorded'
			},
			201
		);
	}

	// ---------------------------------------------------------------------
	// EXPENSE (opex + sales_cost + allowance)
	// ---------------------------------------------------------------------
	if (bucket === 'expense') {
		const expenseType: 'opex' | 'sales_cost' = body.expenseType === 'sales_cost' ? 'sales_cost' : 'opex';
		const category = str(body.category) || 'others';
		const amount = num(fields.totalAmount) ?? 0;
		const date = str(fields.documentDate) || str(fields.dateStart) || now.slice(0, 10);

		const expenseRow = await expenseApi.create({
			projectId,
			expenseType,
			category,
			amount,
			currency: str(fields.currency) || 'SGD',
			date,
			vendorOrSupplier: str(fields.supplierName) || null,
			staffName: str(fields.staffName) || null,
			reimbursement: fields.reimbursement === true,
			businessTrip: fields.businessTrip === true,
			destination: str(fields.destination) || null,
			notes: null,
			documentRef: body.fileKey ?? null,
			metadata: buildExpenseMetadata(category, fields, body.categoryDocType)
		});

		// Allowance has no file → no documents row
		if (!isAllowance) {
			await db.insert(schema.documents).values({
				id: crypto.randomUUID(),
				projectId,
				uploadedBy,
				entityType: 'expense',
				entityId: expenseRow.id,
				fileKey: body.fileKey!,
				fileName: body.fileName!,
				fileType: fileTypeCategory(body.fileType!),
				purpose: 'financial',
				docType: mapDocumentsDocType(bucket, docType, body.categoryDocType ?? null),
				ocrStatus: 'done',
				ocrResult: JSON.stringify({
					source: 'intake',
					submittedAt: now,
					expenseType,
					category,
					fields
				}),
				createdAt: now,
				updatedAt: now
			});
		}

		return ok(
			{
				entityType: 'expense',
				entityId: expenseRow.id,
				message: isAllowance ? 'Allowance recorded' : 'Expense recorded'
			},
			201
		);
	}

	// ---------------------------------------------------------------------
	// DOCUMENT ONLY (reference archive)
	// ---------------------------------------------------------------------
	const documentId = crypto.randomUUID();
	const docTypeForDocs = mapDocumentsDocType(bucket, docType, null);

	if (docType === 'contract') {
		const contractId = crypto.randomUUID();
		await db.insert(schema.contracts).values({
			id: contractId,
			projectId,
			clientName: str(fields.clientName) || null,
			contractNumber: str(fields.contractNumber) || null,
			effectiveDate: str(fields.effectiveDate) || null,
			expiryDate: str(fields.expiryDate) || null,
			amount: num(fields.totalAmount),
			currency: str(fields.currency) || 'SGD',
			scope: str(fields.scope) || null,
			paymentTerms: str(fields.paymentTerms) || null,
			type: 'customer_contract',
			status: 'active',
			fileUrl: body.fileKey!,
			metadata: JSON.stringify({ source: 'intake', fields }),
			notes: null,
			createdAt: now,
			updatedAt: now
		});
		await db.insert(schema.documents).values({
			id: documentId,
			projectId,
			uploadedBy,
			entityType: 'contract',
			entityId: contractId,
			fileKey: body.fileKey!,
			fileName: body.fileName!,
			fileType: fileTypeCategory(body.fileType!),
			purpose: 'reference',
			docType: docTypeForDocs,
			ocrStatus: 'done',
			ocrResult: JSON.stringify({ source: 'intake', fields }),
			notes: 'Archive only. Not included in cashflow calculation.',
			createdAt: now,
			updatedAt: now
		});
		return ok({ entityType: 'contract', entityId: contractId, documentId, message: 'Contract filed' }, 201);
	}

	if (docType === 'quotation') {
		// quotations.project_id is NOT NULL. When the user filed this without
		// a project, skip the typed row and archive only (mirrors existing
		// /api/doc-hub/upload behaviour).
		let quotationId: string | null = null;
		if (projectId) {
			quotationId = crypto.randomUUID();
			await db.insert(schema.quotations).values({
				id: quotationId,
				projectId,
				clientName: str(fields.clientName) || null,
				quotationNumber: str(fields.quotationNumber) || null,
				date: str(fields.documentDate) || null,
				validUntil: str(fields.validUntil) || null,
				amount: num(fields.totalAmount),
				currency: str(fields.currency) || 'SGD',
				fileUrl: body.fileKey!,
				metadata: JSON.stringify({ source: 'intake', fields }),
				status: 'draft',
				notes: null,
				createdAt: now,
				updatedAt: now
			});
		}
		await db.insert(schema.documents).values({
			id: documentId,
			projectId,
			uploadedBy,
			entityType: quotationId ? 'quotation' : null,
			entityId: quotationId,
			fileKey: body.fileKey!,
			fileName: body.fileName!,
			fileType: fileTypeCategory(body.fileType!),
			purpose: 'reference',
			docType: docTypeForDocs,
			ocrStatus: 'done',
			ocrResult: JSON.stringify({ source: 'intake', fields }),
			notes: 'Archive only. Not included in cashflow calculation.',
			createdAt: now,
			updatedAt: now
		});
		return ok(
			{
				entityType: quotationId ? 'quotation' : null,
				entityId: quotationId,
				documentId,
				message: quotationId ? 'Quotation filed' : 'Quotation archived (no project)'
			},
			201
		);
	}

	if (docType === 'purchase_order') {
		// purchase_orders.project_id is NOT NULL — same fallback as quotation.
		let poId: string | null = null;
		if (projectId) {
			poId = crypto.randomUUID();
			const poNumber = str(fields.poNumber) || `PO-${Date.now().toString(36).toUpperCase()}`;
			await db.insert(schema.purchaseOrders).values({
				id: poId,
				projectId,
				poNumber,
				supplierName: str(fields.supplierName) || 'Unknown supplier',
				clientName: str(fields.clientName) || null,
				date: str(fields.documentDate) || null,
				amount: num(fields.totalAmount),
				currency: str(fields.currency) || 'SGD',
				description: str(fields.description) || null,
				fileUrl: body.fileKey!,
				metadata: JSON.stringify({ source: 'intake', fields }),
				status: 'draft',
				notes: null,
				createdAt: now,
				updatedAt: now
			});
		}
		await db.insert(schema.documents).values({
			id: documentId,
			projectId,
			uploadedBy,
			entityType: poId ? 'purchase_order' : null,
			entityId: poId,
			fileKey: body.fileKey!,
			fileName: body.fileName!,
			fileType: fileTypeCategory(body.fileType!),
			purpose: 'reference',
			docType: docTypeForDocs,
			ocrStatus: 'done',
			ocrResult: JSON.stringify({ source: 'intake', fields }),
			notes: 'Archive only. Not included in cashflow calculation.',
			createdAt: now,
			updatedAt: now
		});
		return ok(
			{
				entityType: poId ? 'purchase_order' : null,
				entityId: poId,
				documentId,
				message: poId ? 'PO filed' : 'PO archived (no project)'
			},
			201
		);
	}

	// docType === 'other' (or unrecognised) — just archive the file.
	await db.insert(schema.documents).values({
		id: documentId,
		projectId,
		uploadedBy,
		entityType: null,
		entityId: null,
		fileKey: body.fileKey!,
		fileName: body.fileName!,
		fileType: fileTypeCategory(body.fileType!),
		purpose: 'reference',
		docType: 'other',
		ocrStatus: 'done',
		ocrResult: JSON.stringify({ source: 'intake', fields }),
		notes: str(fields.notes) || 'Archive only. Not included in cashflow calculation.',
		createdAt: now,
		updatedAt: now
	});
	return ok({ entityType: null, entityId: null, documentId, message: 'Document archived' }, 201);
};

/**
 * Pack category-specific non-column fields into the metadata JSON.
 * Mirrors smartfin-expense-revenue-design.md §6.4 examples:
 *   - logistics → tracking_number
 *   - purchase → po_number + description
 *   - sales_cost invoice → invoice_number + due_date
 *   - ai_subscription → invoice_number + service_name + period
 *   - allowance → days, daily_rate, date_start, date_end
 */
function buildExpenseMetadata(
	category: string,
	fields: Record<string, unknown>,
	categoryDocType: string | null | undefined
): string | null {
	const meta: Record<string, unknown> = {};

	if (category === 'logistics' && fields.trackingNumber) {
		meta.tracking_number = fields.trackingNumber;
	}
	if (category === 'purchase') {
		if (fields.poNumber) meta.po_number = fields.poNumber;
		if (fields.description) meta.description = fields.description;
	}
	if (category === 'invoice' || (categoryDocType === 'invoice' && category !== 'purchase')) {
		if (fields.invoiceNumber) meta.invoice_number = fields.invoiceNumber;
		if (fields.dueDate) meta.due_date = fields.dueDate;
	}
	if (category === 'receipt') {
		if (fields.invoiceNumber) meta.receipt_number = fields.invoiceNumber;
	}
	if (category === 'ai_subscription') {
		if (fields.invoiceNumber) meta.invoice_number = fields.invoiceNumber;
		if (fields.dueDate) meta.next_billing = fields.dueDate;
	}
	if (category === 'allowance') {
		if (fields.dateStart) meta.date_start = fields.dateStart;
		if (fields.dateEnd) meta.date_end = fields.dateEnd;
	}

	return Object.keys(meta).length > 0 ? JSON.stringify(meta) : null;
}
