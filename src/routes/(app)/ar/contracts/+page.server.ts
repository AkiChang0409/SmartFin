import { and, desc, eq, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform, url }) => {
	if (!platform) return { contracts: [], projects: [], filters: { projectId: '' } };

	const db = getDb(platform.env);
	const projectId = url.searchParams.get('projectId') ?? '';

	const conditions = [isNull(schema.contracts.deletedAt)];
	if (projectId) conditions.push(eq(schema.contracts.projectId, projectId));

	const contracts = await db
		.select()
		.from(schema.contracts)
		.where(and(...conditions))
		.orderBy(desc(schema.contracts.date), desc(schema.contracts.createdAt));

	const projects = await db
		.select({ id: schema.projects.id, name: schema.projects.name })
		.from(schema.projects)
		.where(isNull(schema.projects.deletedAt))
		.orderBy(desc(schema.projects.updatedAt));

	const projectMap = new Map(projects.map((project) => [project.id, project.name]));

	return {
		contracts: contracts.map((item) => ({
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
		const currency = String(form.get('currency') ?? 'SGD');
		const date = String(form.get('date') ?? '');
		const notes = String(form.get('notes') ?? '');

		if (!projectId) return fail(400, { message: 'Project is required.' });

		const db = getDb(platform.env);
		await db.insert(schema.contracts).values({
			id: crypto.randomUUID(),
			projectId,
			fileUrl: 'manual://pending-upload',
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
		const contractId = String(form.get('contractId') ?? '');
		const amount = Number.parseFloat(String(form.get('amount') ?? '0'));
		const currency = String(form.get('currency') ?? 'SGD');
		const date = String(form.get('date') ?? '');
		const notes = String(form.get('notes') ?? '');

		if (!contractId) return fail(400, { message: 'Missing contract record ID.' });

		const db = getDb(platform.env);
		await db
			.update(schema.contracts)
			.set({
				amount: Number.isFinite(amount) ? amount : 0,
				currency,
				date: date || null,
				metadata: notes ? JSON.stringify({ notes }) : null,
				updatedAt: new Date().toISOString()
			})
			.where(and(eq(schema.contracts.id, contractId), isNull(schema.contracts.deletedAt)));

		return { ok: true };
	},
	delete: async ({ request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const contractId = String(form.get('contractId') ?? '');
		if (!contractId) return fail(400, { message: 'Missing contract record ID.' });

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.contracts)
			.set({ deletedAt: now, updatedAt: now })
			.where(and(eq(schema.contracts.id, contractId), isNull(schema.contracts.deletedAt)));

		return { ok: true };
	}
};
