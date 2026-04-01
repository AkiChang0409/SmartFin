import { and, desc, eq, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/db';
import { processInvoiceOcrMessage } from '$lib/server/ocr/process-invoice';
import { buildObjectKey } from '$lib/server/r2';
import type { OcrQueueMessage } from '$lib/server/ocr/types';

export const load: PageServerLoad = async ({ platform, url }) => {
	if (!platform) return { invoices: [], projects: [], filters: { projectId: '', status: '' } };

	const db = getDb(platform.env);
	const projectId = url.searchParams.get('projectId') ?? '';
	const status = url.searchParams.get('status') ?? '';

	const conditions = [isNull(schema.invoicesIn.deletedAt)];
	if (projectId) conditions.push(eq(schema.invoicesIn.projectId, projectId));
	if (status) conditions.push(eq(schema.invoicesIn.status, status));

	const invoices = await db
		.select()
		.from(schema.invoicesIn)
		.where(and(...conditions))
		.orderBy(desc(schema.invoicesIn.invoiceDate), desc(schema.invoicesIn.createdAt));

	const projects = await db
		.select({ id: schema.projects.id, name: schema.projects.name })
		.from(schema.projects)
		.where(isNull(schema.projects.deletedAt))
		.orderBy(desc(schema.projects.updatedAt));

	const projectMap = new Map(projects.map((project) => [project.id, project.name]));

	return {
		invoices: invoices.map((item) => ({
			...item,
			projectName: projectMap.get(item.projectId) ?? item.projectId,
			rawParsed: item.rawOcr ? tryParseJson(item.rawOcr) : null
		})),
		projects,
		filters: { projectId, status }
	};
};

export const actions: Actions = {
	upload: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const projectId = String(form.get('projectId') ?? '');
		const file = form.get('file');
		const triggerOcr = String(form.get('triggerOcr') ?? 'true') !== 'false';

		if (!projectId) return fail(400, { message: 'Project is required.' });
		if (!(file instanceof File)) return fail(400, { message: 'Invoice file is required.' });

		const entityId = crypto.randomUUID();
		const key = buildObjectKey({
			projectId,
			fileName: file.name,
			contentType: file.type || 'application/octet-stream',
			entityType: 'invoice_in',
			entityId
		});

		await platform.env.R2.put(key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type || 'application/octet-stream' }
		});

		const db = getDb(platform.env);
		await db.insert(schema.invoicesIn).values({
			id: entityId,
			projectId,
			poId: null,
			supplierName: null,
			invoiceDate: null,
			amount: 0,
			currency: 'SGD',
			gstAmount: 0,
			dueDate: null,
			poNumber: null,
			status: triggerOcr ? 'processing' : 'pending_review',
			fileUrl: key,
			ocrConfidence: null,
			rawOcr: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});

		if (triggerOcr) {
			const message: OcrQueueMessage = {
				id: crypto.randomUUID(),
				fileKey: key,
				fileType: file.type || 'application/octet-stream',
				entityType: 'invoice_in',
				entityId,
				projectId
			};
			await platform.env.OCR_QUEUE.send(message);
		}

		return { ok: true, uploaded: true };
	},
	retryQueue: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const invoiceId = String(form.get('invoiceId') ?? '');
		if (!invoiceId) return fail(400, { message: 'Missing supplier invoice record ID.' });

		const db = getDb(platform.env);
		const [invoice] = await db
			.select()
			.from(schema.invoicesIn)
			.where(and(eq(schema.invoicesIn.id, invoiceId), isNull(schema.invoicesIn.deletedAt)))
			.limit(1);
		if (!invoice) return fail(404, { message: 'Supplier invoice not found.' });

		await db
			.update(schema.invoicesIn)
			.set({ status: 'processing', updatedAt: new Date().toISOString() })
			.where(eq(schema.invoicesIn.id, invoiceId));

		const message: OcrQueueMessage = {
			id: crypto.randomUUID(),
			fileKey: invoice.fileUrl,
			fileType: 'application/pdf',
			entityType: 'invoice_in',
			entityId: invoice.id,
			projectId: invoice.projectId
		};
		await platform.env.OCR_QUEUE.send(message);

		return { ok: true };
	},
	processNow: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const invoiceId = String(form.get('invoiceId') ?? '');
		if (!invoiceId) return fail(400, { message: 'Missing supplier invoice record ID.' });

		const db = getDb(platform.env);
		const [invoice] = await db
			.select()
			.from(schema.invoicesIn)
			.where(and(eq(schema.invoicesIn.id, invoiceId), isNull(schema.invoicesIn.deletedAt)))
			.limit(1);
		if (!invoice) return fail(404, { message: 'Supplier invoice not found.' });

		await db
			.update(schema.invoicesIn)
			.set({ status: 'processing', updatedAt: new Date().toISOString() })
			.where(eq(schema.invoicesIn.id, invoiceId));

		const result = await processInvoiceOcrMessage(platform.env, {
			id: crypto.randomUUID(),
			fileKey: invoice.fileUrl,
			fileType: 'application/pdf',
			entityType: 'invoice_in',
			entityId: invoice.id,
			projectId: invoice.projectId
		});

		if (result.status === 'failed') {
			return fail(500, { message: `OCR processing failed: ${result.error ?? 'unknown error'}` });
		}

		return { ok: true };
	},
	confirm: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const invoiceId = String(form.get('invoiceId') ?? '');
		const supplierName = String(form.get('supplierName') ?? '').trim();
		const invoiceDate = String(form.get('invoiceDate') ?? '');
		const dueDate = String(form.get('dueDate') ?? '');
		const poNumber = String(form.get('poNumber') ?? '').trim();
		const amount = Number.parseFloat(String(form.get('amount') ?? '0'));
		const gstAmount = Number.parseFloat(String(form.get('gstAmount') ?? '0'));
		const currency = String(form.get('currency') ?? 'SGD');
		const status = String(form.get('status') ?? 'pending_review');

		if (!invoiceId || !invoiceDate) return fail(400, { message: 'Invoice ID and invoice date are required.' });

		const db = getDb(platform.env);
		await db
			.update(schema.invoicesIn)
			.set({
				supplierName: supplierName || null,
				invoiceDate,
				amount: Number.isFinite(amount) ? amount : 0,
				currency,
				gstAmount: Number.isFinite(gstAmount) ? gstAmount : 0,
				dueDate: dueDate || null,
				poNumber: poNumber || null,
				status: status || 'confirmed',
				updatedAt: new Date().toISOString()
			})
			.where(and(eq(schema.invoicesIn.id, invoiceId), isNull(schema.invoicesIn.deletedAt)));
		return { ok: true };
	},
	delete: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const invoiceId = String(form.get('invoiceId') ?? '');
		if (!invoiceId) return fail(400, { message: 'Missing supplier invoice record ID.' });

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.invoicesIn)
			.set({ deletedAt: now, updatedAt: now })
			.where(and(eq(schema.invoicesIn.id, invoiceId), isNull(schema.invoicesIn.deletedAt)));
		return { ok: true };
	}
};

function tryParseJson(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
