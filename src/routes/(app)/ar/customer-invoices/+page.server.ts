import { and, desc, eq, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform, url }) => {
	if (!platform) return { invoices: [], projects: [], customers: [], filters: { projectId: '', status: '' } };

	const db = getDb(platform.env);
	const projectId = url.searchParams.get('projectId') ?? '';
	const status = url.searchParams.get('status') ?? '';

	const conditions = [isNull(schema.invoicesOut.deletedAt)];
	if (projectId) conditions.push(eq(schema.invoicesOut.projectId, projectId));
	if (status) conditions.push(eq(schema.invoicesOut.status, status));

	const invoices = await db
		.select()
		.from(schema.invoicesOut)
		.where(and(...conditions))
		.orderBy(desc(schema.invoicesOut.date), desc(schema.invoicesOut.createdAt));

	const projects = await db
		.select({ id: schema.projects.id, name: schema.projects.name })
		.from(schema.projects)
		.where(isNull(schema.projects.deletedAt))
		.orderBy(desc(schema.projects.updatedAt));

	const customers = await db
		.select({ id: schema.customers.id, name: schema.customers.name })
		.from(schema.customers)
		.where(isNull(schema.customers.deletedAt))
		.orderBy(desc(schema.customers.updatedAt));

	const projectMap = new Map(projects.map((project) => [project.id, project.name]));
	const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]));

	return {
		invoices: invoices.map((item) => ({
			...item,
			projectName: projectMap.get(item.projectId) ?? item.projectId,
			customerName: customerMap.get(item.customerId) ?? item.customerId
		})),
		projects,
		customers,
		filters: { projectId, status }
	};
};

export const actions: Actions = {
	create: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const projectId = String(form.get('projectId') ?? '');
		const customerId = String(form.get('customerId') ?? '');
		const date = String(form.get('date') ?? '');
		const dueDate = String(form.get('dueDate') ?? '');
		const currency = String(form.get('currency') ?? 'SGD');
		const gstType = String(form.get('gstType') ?? 'standard') as 'standard' | 'zero' | 'exempt';
		const subtotal = Number.parseFloat(String(form.get('subtotal') ?? '0'));
		const status = String(form.get('status') ?? 'draft');

		if (!projectId || !customerId || !date) {
			return fail(400, { message: 'Project, customer, and invoice date are required.' });
		}

		const sub = Number.isFinite(subtotal) ? subtotal : 0;
		const gstAmount = gstType === 'standard' ? sub * 0.09 : 0;
		const total = sub + gstAmount;

		const db = getDb(platform.env);
		await db.insert(schema.invoicesOut).values({
			id: crypto.randomUUID(),
			projectId,
			customerId,
			invoiceNo: `INV-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`,
			date,
			dueDate: dueDate || null,
			currency,
			subtotal: sub,
			gstType,
			gstAmount,
			total,
			status,
			lineItems: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
		return { ok: true };
	},
	update: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const invoiceId = String(form.get('invoiceId') ?? '');
		const dueDate = String(form.get('dueDate') ?? '');
		const currency = String(form.get('currency') ?? 'SGD');
		const gstType = String(form.get('gstType') ?? 'standard') as 'standard' | 'zero' | 'exempt';
		const subtotal = Number.parseFloat(String(form.get('subtotal') ?? '0'));
		const status = String(form.get('status') ?? 'draft');
		if (!invoiceId) return fail(400, { message: 'Missing invoice record ID.' });

		const sub = Number.isFinite(subtotal) ? subtotal : 0;
		const gstAmount = gstType === 'standard' ? sub * 0.09 : 0;
		const total = sub + gstAmount;

		const db = getDb(platform.env);
		await db
			.update(schema.invoicesOut)
			.set({
				dueDate: dueDate || null,
				currency,
				gstType,
				subtotal: sub,
				gstAmount,
				total,
				status,
				updatedAt: new Date().toISOString()
			})
			.where(and(eq(schema.invoicesOut.id, invoiceId), isNull(schema.invoicesOut.deletedAt)));
		return { ok: true };
	},
	delete: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const invoiceId = String(form.get('invoiceId') ?? '');
		if (!invoiceId) return fail(400, { message: 'Missing invoice record ID.' });

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.invoicesOut)
			.set({ deletedAt: now, updatedAt: now })
			.where(and(eq(schema.invoicesOut.id, invoiceId), isNull(schema.invoicesOut.deletedAt)));
		return { ok: true };
	}
};
