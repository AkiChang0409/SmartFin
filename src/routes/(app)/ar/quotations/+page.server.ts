import { and, desc, eq, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform, url }) => {
	if (!platform) return { quotations: [], projects: [], filters: { projectId: '' } };

	const db = getDb(platform.env);
	const projectId = url.searchParams.get('projectId') ?? '';

	const conditions = [isNull(schema.quotations.deletedAt)];
	if (projectId) conditions.push(eq(schema.quotations.projectId, projectId));

	const quotations = await db
		.select()
		.from(schema.quotations)
		.where(and(...conditions))
		.orderBy(desc(schema.quotations.date), desc(schema.quotations.createdAt));

	const projects = await db
		.select({ id: schema.projects.id, name: schema.projects.name })
		.from(schema.projects)
		.where(isNull(schema.projects.deletedAt))
		.orderBy(desc(schema.projects.updatedAt));

	const projectMap = new Map(projects.map((project) => [project.id, project.name]));

	return {
		quotations: quotations.map((item) => ({
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
		const amount = Number.parseFloat(String(form.get('amount') ?? '0'));
		const sourceType = String(form.get('sourceType') ?? 'manual');
		const currency = String(form.get('currency') ?? 'SGD');
		const date = String(form.get('date') ?? '');
		const notes = String(form.get('notes') ?? '');

		if (!projectId) return fail(400, { message: 'Project is required.' });

		const db = getDb(platform.env);
		await db.insert(schema.quotations).values({
			id: crypto.randomUUID(),
			projectId,
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
	update: async ({ request, platform }) => {
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
			.where(and(eq(schema.quotations.id, quotationId), isNull(schema.quotations.deletedAt)));
		return { ok: true };
	},
	delete: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const quotationId = String(form.get('quotationId') ?? '');
		if (!quotationId) return fail(400, { message: 'Missing quotation record ID.' });

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.quotations)
			.set({ deletedAt: now, updatedAt: now })
			.where(and(eq(schema.quotations.id, quotationId), isNull(schema.quotations.deletedAt)));

		return { ok: true };
	}
};
