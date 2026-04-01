import { and, eq, isNull, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { writeAuditLog } from '$lib/server/audit';
import { getDb, schema } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform) {
		throw error(500, 'Cloudflare platform bindings are required');
	}

	const db = getDb(platform.env);
	const [project] = await db
		.select()
		.from(schema.projects)
		.where(and(eq(schema.projects.id, params.id), isNull(schema.projects.deletedAt)))
		.limit(1);

	if (!project) {
		throw error(404, 'Project not found');
	}

	const [customer] = await db
		.select({ id: schema.customers.id, name: schema.customers.name })
		.from(schema.customers)
		.where(eq(schema.customers.id, project.customerId))
		.limit(1);

	const [revenue] = await db
		.select({ total: sql<number>`coalesce(sum(${schema.invoicesOut.total}), 0)` })
		.from(schema.invoicesOut)
		.where(and(eq(schema.invoicesOut.projectId, params.id), isNull(schema.invoicesOut.deletedAt)));
	const [purchaseCost] = await db
		.select({ total: sql<number>`coalesce(sum(${schema.invoicesIn.amount}), 0)` })
		.from(schema.invoicesIn)
		.where(and(eq(schema.invoicesIn.projectId, params.id), isNull(schema.invoicesIn.deletedAt)));
	const [staffCost] = await db
		.select({ total: sql<number>`coalesce(sum(${schema.projectCompensations.amount}), 0)` })
		.from(schema.projectCompensations)
		.where(and(eq(schema.projectCompensations.projectId, params.id), isNull(schema.projectCompensations.deletedAt)));
	const [expenseCost] = await db
		.select({ total: sql<number>`coalesce(sum(${schema.expenses.amount}), 0)` })
		.from(schema.expenses)
		.where(and(eq(schema.expenses.projectId, params.id), isNull(schema.expenses.deletedAt)));

	const [revenueItems, purchaseItems, staffItems, expenseItems] = await Promise.all([
		db
			.select({
				id: schema.invoicesOut.id,
				label: schema.invoicesOut.invoiceNo,
				date: schema.invoicesOut.date,
				status: schema.invoicesOut.status,
				amount: schema.invoicesOut.total
			})
			.from(schema.invoicesOut)
			.where(and(eq(schema.invoicesOut.projectId, params.id), isNull(schema.invoicesOut.deletedAt)))
			.orderBy(sql`${schema.invoicesOut.date} desc`, sql`${schema.invoicesOut.createdAt} desc`),
		db
			.select({
				id: schema.invoicesIn.id,
				label: schema.invoicesIn.poNumber,
				date: schema.invoicesIn.invoiceDate,
				status: schema.invoicesIn.status,
				amount: schema.invoicesIn.amount
			})
			.from(schema.invoicesIn)
			.where(and(eq(schema.invoicesIn.projectId, params.id), isNull(schema.invoicesIn.deletedAt)))
			.orderBy(sql`${schema.invoicesIn.invoiceDate} desc`, sql`${schema.invoicesIn.createdAt} desc`),
		db
			.select({
				id: schema.projectCompensations.id,
				label: schema.projectCompensations.type,
				date: schema.projectCompensations.date,
				status: schema.projectCompensations.description,
				amount: schema.projectCompensations.amount
			})
			.from(schema.projectCompensations)
			.where(and(eq(schema.projectCompensations.projectId, params.id), isNull(schema.projectCompensations.deletedAt)))
			.orderBy(sql`${schema.projectCompensations.date} desc`, sql`${schema.projectCompensations.createdAt} desc`),
		db
			.select({
				id: schema.expenses.id,
				label: schema.expenses.category,
				date: schema.expenses.date,
				status: schema.expenses.subcategory,
				amount: schema.expenses.amount
			})
			.from(schema.expenses)
			.where(and(eq(schema.expenses.projectId, params.id), isNull(schema.expenses.deletedAt)))
			.orderBy(sql`${schema.expenses.date} desc`, sql`${schema.expenses.createdAt} desc`)
	]);

	const breakdown = {
		revenue: revenue?.total ?? 0,
		purchaseCost: purchaseCost?.total ?? 0,
		staffCost: staffCost?.total ?? 0,
		expenseCost: expenseCost?.total ?? 0
	};

	return {
		project,
		customerName: customer?.name ?? project.customerId,
		breakdown,
		details: {
			revenueItems,
			purchaseItems,
			staffItems,
			expenseItems
		},
		profit:
			breakdown.revenue - breakdown.purchaseCost - breakdown.staffCost - breakdown.expenseCost
	};
};

export const actions: Actions = {
	update: async ({ params, request, platform, locals }) => {
		if (!platform) {
			return fail(500, { message: 'Cloudflare platform bindings are required' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const status = String(form.get('status') ?? '');
		const startDate = String(form.get('startDate') ?? '');
		const endDate = String(form.get('endDate') ?? '');
		const description = String(form.get('description') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Project name cannot be empty.' });
		}

		const db = getDb(platform.env);
		await db
			.update(schema.projects)
			.set({
				name,
				status: status || 'active',
				startDate: startDate || null,
				endDate: endDate || null,
				description: description || null,
				updatedAt: new Date().toISOString()
			})
			.where(and(eq(schema.projects.id, params.id), isNull(schema.projects.deletedAt)));

		await writeAuditLog(platform, locals.user, {
			action: 'project.update',
			entityType: 'project',
			entityId: params.id,
			metadata: { status: status || 'active', name }
		});

		return { ok: true };
	},
	archive: async ({ params, platform, locals }) => {
		if (!platform) {
			return fail(500, { message: 'Cloudflare platform bindings are required' });
		}

		const db = getDb(platform.env);
		await db
			.update(schema.projects)
			.set({
				status: 'archived',
				updatedAt: new Date().toISOString()
			})
			.where(and(eq(schema.projects.id, params.id), isNull(schema.projects.deletedAt)));

		await writeAuditLog(platform, locals.user, {
			action: 'project.archive',
			entityType: 'project',
			entityId: params.id
		});

		return { ok: true };
	},
	remove: async ({ params, platform, locals }) => {
		if (!platform) {
			return fail(500, { message: 'Cloudflare platform bindings are required' });
		}

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.projects)
			.set({
				deletedAt: now,
				updatedAt: now
			})
			.where(and(eq(schema.projects.id, params.id), isNull(schema.projects.deletedAt)));

		await writeAuditLog(platform, locals.user, {
			action: 'project.remove',
			entityType: 'project',
			entityId: params.id
		});

		throw redirect(303, '/projects');
	}
};
