import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';
import { fail, ok } from '$lib/server/http';

/**
 * GET /api/documents/[id]/status
 *
 * Poll the OCR status of a document.
 * Returns the current status and OCR result if completed.
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const { id } = params;

	if (!id) {
		return fail('Document ID is required');
	}

	const db = getDb(platform.env);

	const [document] = await db
		.select({
			id: schema.documents.id,
			ocrStatus: schema.documents.ocrStatus,
			ocrResult: schema.documents.ocrResult,
			ocrConfidence: schema.documents.ocrConfidence,
			docType: schema.documents.docType,
			purpose: schema.documents.purpose,
			updatedAt: schema.documents.updatedAt
		})
		.from(schema.documents)
		.where(eq(schema.documents.id, id))
		.limit(1);

	if (!document) {
		return fail('Document not found', 404);
	}

	// Parse OCR result if available
	let parsedResult = null;
	if (document.ocrResult) {
		try {
			parsedResult = JSON.parse(document.ocrResult);
		} catch {
			parsedResult = { raw: document.ocrResult };
		}
	}

	// If OCR is completed and this is a financial document, check for linked expense
	let expenseId = null;
	if (document.ocrStatus === 'done' && document.purpose === 'financial') {
		const [expense] = await db
			.select({ id: schema.expenses.id })
			.from(schema.expenses)
			.where(eq(schema.expenses.documentRef, document.id))
			.limit(1);
		if (!expense) {
			// Also try matching by file key stored in documentRef
			const docRecord = await db
				.select({ fileKey: schema.documents.fileKey })
				.from(schema.documents)
				.where(eq(schema.documents.id, id))
				.limit(1);
			if (docRecord[0]?.fileKey) {
				const [expByKey] = await db
					.select({ id: schema.expenses.id })
					.from(schema.expenses)
					.where(eq(schema.expenses.documentRef, docRecord[0].fileKey))
					.limit(1);
				expenseId = expByKey?.id || null;
			}
		} else {
			expenseId = expense.id;
		}
	}

	return ok({
		documentId: document.id,
		ocrStatus: document.ocrStatus,
		ocrResult: parsedResult,
		ocrConfidence: document.ocrConfidence,
		docType: document.docType,
		purpose: document.purpose,
		expenseId,
		updatedAt: document.updatedAt
	});
};
