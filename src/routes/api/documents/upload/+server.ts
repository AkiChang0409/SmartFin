import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';
import { fail, ok } from '$lib/server/http';
import { objectExists } from '$lib/server/r2';

/**
 * POST /api/documents/upload
 *
 * Creates a document record for reference documents (no financial impact).
 * Optionally runs OCR for metadata extraction.
 *
 * Body: {
 *   key: string - R2 object key
 *   fileName: string - Original file name
 *   fileType: string - MIME type
 *   projectId: string - Project ID (required for reference docs)
 *   docType: 'contract' | 'po' | 'bom' | 'quotation' | 'other'
 *   notes?: string - Optional description
 *   triggerOcr?: boolean - Whether to run OCR for metadata extraction
 * }
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const body = (await request.json()) as {
		key?: string;
		fileName?: string;
		fileType?: string;
		projectId?: string;
		docType?: 'contract' | 'po' | 'bom' | 'quotation' | 'other';
		notes?: string;
		triggerOcr?: boolean;
	};

	if (!body.key || !body.fileName || !body.fileType || !body.projectId || !body.docType) {
		return fail('Missing required fields: key, fileName, fileType, projectId, docType');
	}

	// Validate docType
	const validDocTypes = ['contract', 'po', 'bom', 'quotation', 'other'];
	if (!validDocTypes.includes(body.docType)) {
		return fail(`Invalid docType. Must be one of: ${validDocTypes.join(', ')}`);
	}

	// Verify file exists in R2
	const exists = await objectExists(platform.env, body.key);
	if (!exists) {
		return fail('Uploaded object was not found in R2', 404);
	}

	const db = getDb(platform.env);
	const now = new Date().toISOString();
	const documentId = crypto.randomUUID();

	// Determine file type category
	const fileTypeCategory = body.fileType.includes('pdf')
		? 'pdf'
		: body.fileType.includes('image')
			? 'image'
			: 'other';

	// Create document record
	await db.insert(schema.documents).values({
		id: documentId,
		projectId: body.projectId,
		uploadedBy: locals.user?.id || 'system',
		fileKey: body.key,
		fileName: body.fileName,
		fileType: fileTypeCategory,
		purpose: 'reference',
		docType: body.docType,
		ocrStatus: body.triggerOcr ? 'pending' : 'done',
		notes: body.notes || null,
		createdAt: now,
		updatedAt: now
	});

	// Optionally trigger OCR for metadata extraction
	if (body.triggerOcr && body.docType === 'contract') {
		const message = {
			id: crypto.randomUUID(),
			fileKey: body.key,
			fileType: body.fileType,
			entityType: 'reference_document',
			entityId: documentId,
			projectId: body.projectId,
			metadata: JSON.stringify({
				docType: body.docType,
				purpose: 'reference',
				documentId
			})
		};

		await platform.env.OCR_QUEUE.send(message);

		await db
			.update(schema.documents)
			.set({
				ocrStatus: 'processing',
				updatedAt: new Date().toISOString()
			})
			.where(eq(schema.documents.id, documentId));

		return ok(
			{
				documentId,
				status: 'queued',
				message: 'Document uploaded and queued for metadata extraction'
			},
			201
		);
	}

	return ok(
		{
			documentId,
			status: 'saved',
			message: 'Reference document uploaded successfully'
		},
		201
	);
};
