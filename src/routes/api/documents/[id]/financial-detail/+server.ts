import { and, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';
import { fail, ok } from '$lib/server/http';

/**
 * GET /api/documents/[id]/financial-detail
 *
 * 用于「待处理」中点击具体文件后，进入处理页时预填 fileKey/fileName/fileType。
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform) return fail('Cloudflare platform bindings are required', 500);
	const { id } = params;
	if (!id) return fail('Document ID is required');

	const db = getDb(platform.env);

	const [row] = await db
		.select({
			documentId: schema.documents.id,
			projectId: schema.documents.projectId,
			fileKey: schema.documents.fileKey,
			fileName: schema.documents.fileName,
			fileType: schema.documents.fileType,
			docType: schema.documents.docType,
			purpose: schema.documents.purpose,
			ocrStatus: schema.documents.ocrStatus,
			entityType: schema.documents.entityType,
			entityId: schema.documents.entityId,
			notes: schema.documents.notes,
			createdAt: schema.documents.createdAt,
			updatedAt: schema.documents.updatedAt
		})
		.from(schema.documents)
		.where(and(eq(schema.documents.id, id), isNull(schema.documents.deletedAt)))
		.limit(1);

	if (!row) return fail('Document not found', 404);
	if (row.purpose !== 'financial') {
		return fail('Document is not a financial document', 400);
	}

	return ok(row);
};
