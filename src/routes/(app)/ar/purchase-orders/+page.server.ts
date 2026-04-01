import { and, desc, eq, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform, url }) => {
	if (!platform) return { purchaseOrders: [], projects: [], filters: { projectId: '' } };

	const db = getDb(platform.env);
	const projectId = url.searchParams.get('projectId') ?? '';

	const conditions = [isNull(schema.purchaseOrders.deletedAt)];
	if (projectId) conditions.push(eq(schema.purchaseOrders.projectId, projectId));

	const purchaseOrders = await db
		.select()
		.from(schema.purchaseOrders)
		.where(and(...conditions))
		.orderBy(desc(schema.purchaseOrders.date), desc(schema.purchaseOrders.createdAt));

	const projects = await db
		.select({ id: schema.projects.id, name: schema.projects.name })
		.from(schema.projects)
		.where(isNull(schema.projects.deletedAt))
		.orderBy(desc(schema.projects.updatedAt));

	const projectMap = new Map(projects.map((project) => [project.id, project.name]));

	return {
		purchaseOrders: purchaseOrders.map((item) => ({
			...item,
			projectName: projectMap.get(item.projectId) ?? item.projectId
		})),
		projects,
		filters: { projectId }
	};
};

export const actions: Actions = {
	create: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const projectId = String(form.get('projectId') ?? '');
		const poNumberInput = String(form.get('poNumber') ?? '').trim();
		const poNumber = poNumberInput || `PO-${Date.now().toString().slice(-8)}`;
		const supplierName = String(form.get('supplierName') ?? '').trim();
		const amount = Number.parseFloat(String(form.get('amount') ?? '0'));
		const currency = String(form.get('currency') ?? 'SGD');
		const date = String(form.get('date') ?? '');

		if (!projectId || !supplierName) return fail(400, { message: 'Project and supplier name are required.' });

		const db = getDb(platform.env);
		await db.insert(schema.purchaseOrders).values({
			id: crypto.randomUUID(),
			projectId,
			poNumber,
			fileUrl: null,
			supplierName,
			amount: Number.isFinite(amount) ? amount : 0,
			currency,
			date: date || null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});

		return { ok: true };
	},
	update: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const purchaseOrderId = String(form.get('purchaseOrderId') ?? '');
		const poNumber = String(form.get('poNumber') ?? '').trim();
		const supplierName = String(form.get('supplierName') ?? '').trim();
		const amount = Number.parseFloat(String(form.get('amount') ?? '0'));
		const currency = String(form.get('currency') ?? 'SGD');
		const date = String(form.get('date') ?? '');
		if (!purchaseOrderId || !poNumber || !supplierName) {
			return fail(400, { message: 'PO number and supplier name are required.' });
		}

		const db = getDb(platform.env);
		await db
			.update(schema.purchaseOrders)
			.set({
				poNumber,
				supplierName,
				amount: Number.isFinite(amount) ? amount : 0,
				currency,
				date: date || null,
				updatedAt: new Date().toISOString()
			})
			.where(and(eq(schema.purchaseOrders.id, purchaseOrderId), isNull(schema.purchaseOrders.deletedAt)));

		return { ok: true };
	},
	delete: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const purchaseOrderId = String(form.get('purchaseOrderId') ?? '');
		if (!purchaseOrderId) return fail(400, { message: 'Missing purchase order record ID.' });

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.purchaseOrders)
			.set({ deletedAt: now, updatedAt: now })
			.where(and(eq(schema.purchaseOrders.id, purchaseOrderId), isNull(schema.purchaseOrders.deletedAt)));

		return { ok: true };
	}
};
