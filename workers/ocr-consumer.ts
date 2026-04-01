import { eq } from 'drizzle-orm';

import { getDb, schema } from '../src/lib/server/db';
import { processInvoiceOcrMessage } from '../src/lib/server/ocr/process-invoice';
import type { OcrQueueMessage } from '../src/lib/server/ocr/types';

type ConsumerEnv = {
	DB: D1Database;
	R2: R2Bucket;
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
	if (payload.entityType === 'invoice_in') {
		const result = await processInvoiceOcrMessage(env as Env, payload);
		if (result.status === 'failed') {
			throw new Error(result.error ?? 'OCR processing failed');
		}
		return;
	}

	const db = getDb(env as Env);
	await db
		.update(schema.invoicesIn)
		.set({
			status: 'failed',
			rawOcr: JSON.stringify({ error: `Unsupported entity type: ${payload.entityType}` }),
			updatedAt: new Date().toISOString()
		})
		.where(eq(schema.invoicesIn.id, payload.entityId));
}
