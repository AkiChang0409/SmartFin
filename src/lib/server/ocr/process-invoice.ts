import { eq } from 'drizzle-orm';

import { getDb, schema } from '$lib/server/db';
import { runOcrPipeline } from '$lib/server/ocr/pipeline';
import type { OcrQueueMessage } from '$lib/server/ocr/types';

type ProcessResult = {
	status: 'pending_review' | 'failed';
	error?: string;
};

export async function processInvoiceOcrMessage(env: Env, payload: OcrQueueMessage): Promise<ProcessResult> {
	if (payload.entityType !== 'invoice_in') {
		return { status: 'failed', error: 'Unsupported entity type for invoice OCR processor' };
	}

	const db = getDb(env);
	try {
		const obj = await env.R2.get(payload.fileKey);
		if (!obj) {
			throw new Error(`R2 object not found: ${payload.fileKey}`);
		}

		const bytes = await obj.arrayBuffer();
		const extracted = await runOcrPipeline(payload.fileType, bytes, env);
		const now = new Date().toISOString();

		await db
			.update(schema.invoicesIn)
			.set({
				invoiceDate: extracted.invoiceDate,
				amount: extracted.totalAmount ?? 0,
				currency: extracted.currency ?? 'SGD',
				supplierName: extracted.supplierName,
				gstAmount: extracted.gstAmount ?? 0,
				dueDate: extracted.dueDate,
				poNumber: extracted.poNumber,
				status: 'pending_review',
				ocrConfidence: extracted.confidence,
				rawOcr: JSON.stringify({
					pipelineVersion: 'v2',
					processedAt: now,
					file: {
						key: payload.fileKey,
						type: payload.fileType
					},
					result: extracted
				}),
				updatedAt: now
			})
			.where(eq(schema.invoicesIn.id, payload.entityId));

		return { status: 'pending_review' };
	} catch (error) {
		await db
			.update(schema.invoicesIn)
			.set({
				status: 'failed',
				rawOcr: JSON.stringify({
					error: error instanceof Error ? error.message : 'Unknown OCR processing error'
				}),
				updatedAt: new Date().toISOString()
			})
			.where(eq(schema.invoicesIn.id, payload.entityId));

		return {
			status: 'failed',
			error: error instanceof Error ? error.message : 'Unknown OCR processing error'
		};
	}
}
