import { and, desc, eq, isNull, ne, or } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';
import { fail, ok } from '$lib/server/http';

/**
 * GET /api/documents/financial-pending
 *
 * 列出「financial」purpose 且尚未关联到 expense 的文档（待用户处理录入）。
 * 待处理判定：documents.purpose='financial' AND
 *   (documents.entityType IS NULL OR documents.entityType != 'expense')
 */
export const GET: RequestHandler = async ({ platform }) => {
	if (!platform) return fail('Cloudflare platform bindings are required', 500);

	const db = getDb(platform.env);

	const rows = await db
		.select({
			documentId: schema.documents.id,
			projectId: schema.documents.projectId,
			fileKey: schema.documents.fileKey,
			fileName: schema.documents.fileName,
			fileType: schema.documents.fileType,
			docType: schema.documents.docType,
			ocrStatus: schema.documents.ocrStatus,
			notes: schema.documents.notes,
			createdAt: schema.documents.createdAt
		})
		.from(schema.documents)
		.where(
			and(
				eq(schema.documents.purpose, 'financial'),
				isNull(schema.documents.deletedAt),
				or(isNull(schema.documents.entityType), ne(schema.documents.entityType, 'expense'))
			)
		)
		.orderBy(desc(schema.documents.createdAt))
		.limit(200);

	return ok({ items: rows });
};
