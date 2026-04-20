import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';
import { fail, ok } from '$lib/server/http';
import { objectExists } from '$lib/server/r2';
import {
	EXPENSE_DOC_TYPES,
	EXPENSE_CATEGORY_OPTIONS,
	CATEGORY_DOC_TYPE_MAP,
	type ExpenseType,
	type ExpenseCategory
} from '$lib/constants/expense-upload';

/**
 * POST /api/expenses/upload
 *
 * Two modes:
 * 1. File upload: R2 object must exist → insert `documents` + insert `expenses` with full payload (no async OCR queue).
 * 2. Allowance (no file): creates expense record directly
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const body = (await request.json()) as {
		key?: string;
		fileName?: string;
		fileType?: string;
		projectId?: string | null;
		expenseType?: ExpenseType;
		category?: string;
		docType?: string | null;
		reimbursement?: boolean;
		businessTrip?: boolean;
		destination?: string | null;
		staffName?: string | null;
		vendorOrSupplier?: string | null;
		amount?: number | null;
		currency?: string;
		gstAmount?: number | null;
		date?: string | null;
		notes?: string | null;
		metadata?: Record<string, unknown>;
		allowance?: boolean;
	};

	// Normalize projectId from UI:
	// - null / undefined / '' / whitespace / 'company' => null (company-level expense)
	// - otherwise keep the trimmed project id
	const normalizedProjectId =
		typeof body.projectId === 'string'
			? (() => {
					const v = body.projectId.trim();
					if (!v || v.toLowerCase() === 'company') return null;
					return v;
				})()
			: null;

	const expenseType: ExpenseType = body.expenseType === 'sales_cost' ? 'sales_cost' : 'opex';
	const category = body.category || EXPENSE_CATEGORY_OPTIONS[expenseType][0];
	const docType = body.docType || CATEGORY_DOC_TYPE_MAP[category as ExpenseCategory] || null;

	// Allowance mode: direct expense creation, no file needed
	if (body.allowance || category === 'allowance') {
		if (!body.staffName) {
			return fail('staffName is required for allowance');
		}

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		const expenseId = crypto.randomUUID();

		await db.insert(schema.expenses).values({
			id: expenseId,
			projectId: normalizedProjectId,
			expenseType: 'opex',
			category: 'allowance',
			date: body.date || now.slice(0, 10),
			amount: body.amount || 0,
			currency: 'SGD',
			sgdEquivalent: body.amount || 0,
			gstAmount: 0,
			staffName: body.staffName,
			reimbursement: body.reimbursement ?? false,
			businessTrip: true,
			destination: body.destination || null,
			metadata: body.metadata ? JSON.stringify(body.metadata) : null,
			notes: body.notes || null,
			createdAt: now,
			updatedAt: now
		});

		return ok({ expenseId, status: 'created', message: 'Allowance expense created' }, 201);
	}

	// File upload mode
	if (!body.key || !body.fileName || !body.fileType) {
		return fail('Missing required fields: key, fileName, fileType');
	}

	if (docType && !EXPENSE_DOC_TYPES.includes(docType as never)) {
		return fail(`Invalid docType. Must be one of: ${EXPENSE_DOC_TYPES.join(', ')}`);
	}

	const exists = await objectExists(platform.env, body.key);
	if (!exists) {
		return fail('Uploaded object was not found in R2', 404);
	}

	const amountNum =
		body.amount !== null && body.amount !== undefined && Number.isFinite(Number(body.amount))
			? Number(body.amount)
			: NaN;
	if (!body.date || !String(body.date).trim()) {
		return fail('date is required for file upload');
	}
	if (!Number.isFinite(amountNum)) {
		return fail('amount is required for file upload (number)');
	}

	const db = getDb(platform.env);
	const now = new Date().toISOString();
	const documentId = crypto.randomUUID();
	const expenseId = crypto.randomUUID();

	const fileTypeCategory = body.fileType.includes('pdf')
		? 'pdf'
		: body.fileType.includes('image')
			? 'image'
			: 'other';

	const currency = (body.currency || 'SGD').trim().toUpperCase();
	const gst =
		body.gstAmount !== null && body.gstAmount !== undefined && Number.isFinite(Number(body.gstAmount))
			? Number(body.gstAmount)
			: 0;
	const sgdEquivalent = currency === 'SGD' ? amountNum : 0;

	const ocrResultPayload = {
		source: 'manual_upload',
		submittedAt: now,
		skippedAsyncOcr: true,
		expenseType,
		category,
		docType
	};

	try {
		await db.insert(schema.documents).values({
			id: documentId,
			projectId: normalizedProjectId,
			uploadedBy: locals.user?.id || 'system',
			fileKey: body.key,
			fileName: body.fileName,
			fileType: fileTypeCategory,
			purpose: 'financial',
			docType: (docType as 'invoice' | 'receipt' | 'po') || 'other',
			ocrStatus: 'done',
			ocrResult: JSON.stringify(ocrResultPayload),
			createdAt: now,
			updatedAt: now
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return fail('Failed to insert documents record', 500, {
			message,
			projectId: normalizedProjectId,
			docType,
			purpose: 'financial'
		});
	}

	try {
		await db.insert(schema.expenses).values({
			id: expenseId,
			projectId: normalizedProjectId,
			expenseType,
			category,
			docType: (docType as 'invoice' | 'receipt' | 'po') || null,
			date: String(body.date).trim(),
			amount: amountNum,
			currency,
			sgdEquivalent,
			gstAmount: gst,
			vendorOrSupplier: body.vendorOrSupplier?.trim() || null,
			staffName: body.staffName?.trim() || null,
			reimbursement: body.reimbursement ?? false,
			businessTrip: body.businessTrip ?? false,
			destination: body.destination?.trim() || null,
			documentRef: body.key,
			metadata: body.metadata ? JSON.stringify(body.metadata) : null,
			notes: body.notes?.trim() || null,
			createdAt: now,
			updatedAt: now
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return fail('Failed to insert expense record', 500, {
			message,
			documentId,
			projectId: normalizedProjectId
		});
	}

	return ok(
		{
			documentId,
			expenseId,
			status: 'created',
			message: 'Document and expense saved (no background OCR queue)'
		},
		201
	);
};
