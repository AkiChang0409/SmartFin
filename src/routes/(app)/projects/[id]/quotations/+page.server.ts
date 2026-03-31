import { and, desc, eq, isNull } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform) throw error(500, 'Cloudflare platform bindings are required');
	const db = getDb(platform.env);
	const [project] = await db
		.select({ id: schema.projects.id, name: schema.projects.name })
		.from(schema.projects)
		.where(and(eq(schema.projects.id, params.id), isNull(schema.projects.deletedAt)))
		.limit(1);
	if (!project) throw error(404, 'Project not found');

	const quotations = await db
		.select()
		.from(schema.quotations)
		.where(and(eq(schema.quotations.projectId, params.id), isNull(schema.quotations.deletedAt)))
		.orderBy(desc(schema.quotations.createdAt));

	return { project, quotations };
};

export const actions: Actions = {
	create: async ({ params, request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const amount = Number.parseFloat(String(form.get('amount') ?? '0'));
		const sourceType = String(form.get('sourceType') ?? 'manual');
		const currency = String(form.get('currency') ?? 'SGD');
		const date = String(form.get('date') ?? '');
		const notes = String(form.get('notes') ?? '');

		const db = getDb(platform.env);
		await db.insert(schema.quotations).values({
			id: crypto.randomUUID(),
			projectId: params.id,
			sourceType,
			fileUrl: null,
			amount: Number.isFinite(amount) ? amount : 0,
			currency,
			date: date || null,
			metadata: notes ? JSON.stringify({ notes }) : null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});
		return { ok: true };
	},
	update: async ({ params, request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const quotationId = String(form.get('quotationId') ?? '');
		const amount = Number.parseFloat(String(form.get('amount') ?? '0'));
		const sourceType = String(form.get('sourceType') ?? 'manual');
		const currency = String(form.get('currency') ?? 'SGD');
		const date = String(form.get('date') ?? '');
		const notes = String(form.get('notes') ?? '');

		if (!quotationId) return fail(400, { message: 'Missing quotation record ID.' });

		const db = getDb(platform.env);
		await db
			.update(schema.quotations)
			.set({
				sourceType,
				amount: Number.isFinite(amount) ? amount : 0,
				currency,
				date: date || null,
				metadata: notes ? JSON.stringify({ notes }) : null,
				updatedAt: new Date().toISOString()
			})
			.where(
				and(
					eq(schema.quotations.id, quotationId),
					eq(schema.quotations.projectId, params.id),
					isNull(schema.quotations.deletedAt)
				)
			);
		return { ok: true };
	},
	delete: async ({ params, request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const quotationId = String(form.get('quotationId') ?? '');
		if (!quotationId) return fail(400, { message: 'Missing quotation record ID.' });

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.quotations)
			.set({ deletedAt: now, updatedAt: now })
			.where(
				and(
					eq(schema.quotations.id, quotationId),
					eq(schema.quotations.projectId, params.id),
					isNull(schema.quotations.deletedAt)
				)
			);

		return { ok: true };
	}
};
