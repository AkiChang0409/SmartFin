import { eq } from 'drizzle-orm';

import { getDb, schema } from '../src/lib/server/db';
import { processInvoiceOcrMessage } from '../src/lib/server/ocr/process-invoice';
import { processExpenseDocumentMessage } from '../src/lib/server/ocr/process-expense';
import type { OcrQueueMessage } from '../src/lib/server/ocr/types';

type ConsumerEnv = {
	DB: D1Database;
	R2: R2Bucket;
	AI?: unknown;
};

export default {
	async queue(batch: MessageBatch<unknown>, env: ConsumerEnv): Promise<void> {
		for (const message of batch.messages) {
			const payload = message.body as OcrQueueMessage;
			try {
				await processMessage(env, payload);
				message.ack();
			} catch (error) {
				console.error('OCR consumer failed', { error, payload });
				message.retry();
			}
		}
	}
};

async function processMessage(env: ConsumerEnv, payload: OcrQueueMessage): Promise<void> {
	// Handle supplier invoice OCR
	if (payload.entityType === 'invoice_in') {
		const result = await processInvoiceOcrMessage(env as Env, payload);
		if (result.status === 'failed') {
			throw new Error(result.error ?? 'OCR processing failed');
		}
		return;
	}

	// Handle expense document OCR (invoice, receipt, contract)
	if (payload.entityType === 'expense_document') {
		// Deprecated path: new expense upload flow writes expense directly on save.
		// Kept only for backward compatibility with old queue producers.
		const result = await processExpenseDocumentMessage(env as Env, payload);
		if (result.status === 'failed') {
			throw new Error(result.error ?? 'Expense document OCR processing failed');
		}
		return;
	}

	// Handle reference document OCR (metadata extraction only)
	if (payload.entityType === 'reference_document') {
		const db = getDb(env as Env);
		try {
			const obj = await (env as Env).R2.get(payload.fileKey);
			if (!obj) {
				throw new Error(`R2 object not found: ${payload.fileKey}`);
			}

			// For reference documents, we just extract metadata and store it
			// No expense is created
			const metadata = JSON.parse(payload.metadata || '{}');
			const documentId = metadata.documentId || payload.entityId;

			await db
				.update(schema.documents)
				.set({
					ocrStatus: 'completed',
					ocrResult: JSON.stringify({
						note: 'Reference document - metadata extraction only',
						processedAt: new Date().toISOString()
					}),
					updatedAt: new Date().toISOString()
				})
				.where(eq(schema.documents.id, documentId));
		} catch (error) {
			const metadata = JSON.parse(payload.metadata || '{}');
			const documentId = metadata.documentId || payload.entityId;
			await db
				.update(schema.documents)
				.set({
					ocrStatus: 'failed',
					ocrResult: JSON.stringify({
						error: error instanceof Error ? error.message : 'Unknown error'
					}),
					updatedAt: new Date().toISOString()
				})
				.where(eq(schema.documents.id, documentId));
		}
		return;
	}

	// Unsupported entity type
	console.warn(`Unsupported entity type: ${payload.entityType}`);
}
