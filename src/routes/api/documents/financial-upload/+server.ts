import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';
import { fail, ok } from '$lib/server/http';
import { objectExists } from '$lib/server/r2';

/**
 * POST /api/documents/financial-upload
 *
 * 移动端两段式上传第一段：仅把文件登记为 `documents`（purpose=financial, ocrStatus=pending），
 * 不创建 expense。后续在「待处理」列表中由用户挨个处理时再调 /api/expenses/upload?documentId=...
 *
 * Body:
 *  - key: R2 object key
 *  - fileName, fileType
 *  - projectId?: 默认 null（公司级）
 *  - docType?: invoice | receipt | po | other（默认 other）
 *  - notes?: string
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform) return fail('Cloudflare platform bindings are required', 500);

	const body = (await request.json()) as {
		key?: string;
		fileName?: string;
		fileType?: string;
		projectId?: string | null;
		docType?: 'invoice' | 'receipt' | 'po' | 'other';
		notes?: string | null;
	};

	if (!body.key || !body.fileName || !body.fileType) {
		return fail('Missing required fields: key, fileName, fileType');
	}

	const validDocTypes = ['invoice', 'receipt', 'po', 'other'] as const;
	const docType = (validDocTypes as readonly string[]).includes(body.docType ?? '')
		? (body.docType as (typeof validDocTypes)[number])
		: 'other';

	const exists = await objectExists(platform.env, body.key);
	if (!exists) return fail('Uploaded object was not found in R2', 404);

	const normalizedProjectId =
		typeof body.projectId === 'string'
			? (() => {
					const v = body.projectId.trim();
					if (!v || v.toLowerCase() === 'company') return null;
					return v;
				})()
			: null;

	const fileTypeCategory = body.fileType.includes('pdf')
		? 'pdf'
		: body.fileType.includes('image')
			? 'image'
			: 'other';

	const db = getDb(platform.env);
	const now = new Date().toISOString();
	const documentId = crypto.randomUUID();

	await db.insert(schema.documents).values({
		id: documentId,
		projectId: normalizedProjectId,
		uploadedBy: locals.user?.id || 'system',
		fileKey: body.key,
		fileName: body.fileName,
		fileType: fileTypeCategory,
		purpose: 'financial',
		docType,
		ocrStatus: 'pending',
		notes: body.notes?.trim() || null,
		createdAt: now,
		updatedAt: now
	});

	return ok(
		{
			documentId,
			status: 'pending',
			message: '文件已加入待处理'
		},
		201
	);
};
