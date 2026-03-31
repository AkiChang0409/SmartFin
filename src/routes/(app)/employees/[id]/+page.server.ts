import { and, desc, eq, isNull } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform) throw error(500, 'Cloudflare platform bindings are required');

	const db = getDb(platform.env);
	const [employee] = await db
		.select()
		.from(schema.employees)
		.where(and(eq(schema.employees.id, params.id), isNull(schema.employees.deletedAt)))
		.limit(1);

	if (!employee) throw error(404, 'Employee not found');

	const salaries = await db
		.select()
		.from(schema.employeeSalaries)
		.where(and(eq(schema.employeeSalaries.employeeId, params.id), isNull(schema.employeeSalaries.deletedAt)))
		.orderBy(desc(schema.employeeSalaries.month), desc(schema.employeeSalaries.createdAt));

	return { employee, salaries };
};

export const actions: Actions = {
	updateProfile: async ({ params, request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const type = String(form.get('type') ?? 'full_time');
		const status = String(form.get('status') ?? 'active');
		const startDate = String(form.get('startDate') ?? '');
		const endDate = String(form.get('endDate') ?? '');
		const contact = String(form.get('contact') ?? '').trim();
		const taxId = String(form.get('taxId') ?? '').trim();

		if (!name) return fail(400, { message: 'Employee name is required.' });

		const db = getDb(platform.env);
		await db
			.update(schema.employees)
			.set({
				name,
				type: type as (typeof schema.employees.$inferInsert)['type'],
				status,
				startDate: startDate || null,
				endDate: endDate || null,
				contact: contact || null,
				taxId: taxId || null,
				updatedAt: new Date().toISOString()
			})
			.where(and(eq(schema.employees.id, params.id), isNull(schema.employees.deletedAt)));

		return { ok: true };
	},
	addSalary: async ({ params, request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const month = String(form.get('month') ?? '').trim();
		const salary = Number.parseFloat(String(form.get('salary') ?? '0'));
		const allowance = Number.parseFloat(String(form.get('allowance') ?? '0'));
		const cpfEmployee = Number.parseFloat(String(form.get('cpfEmployee') ?? '0'));
		const cpfEmployer = Number.parseFloat(String(form.get('cpfEmployer') ?? '0'));

		if (!month) return fail(400, { message: 'Month is required.' });

		const db = getDb(platform.env);
		await db.insert(schema.employeeSalaries).values({
			id: crypto.randomUUID(),
			employeeId: params.id,
			month,
			salary: Number.isFinite(salary) ? salary : 0,
			allowance: Number.isFinite(allowance) ? allowance : 0,
			cpfEmployee: Number.isFinite(cpfEmployee) ? cpfEmployee : 0,
			cpfEmployer: Number.isFinite(cpfEmployer) ? cpfEmployer : 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});

		return { ok: true };
	},
	deleteSalary: async ({ params, request, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const form = await request.formData();
		const salaryId = String(form.get('salaryId') ?? '');
		if (!salaryId) return fail(400, { message: 'Missing salary record ID.' });

		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.employeeSalaries)
			.set({ deletedAt: now, updatedAt: now })
			.where(
				and(
					eq(schema.employeeSalaries.id, salaryId),
					eq(schema.employeeSalaries.employeeId, params.id),
					isNull(schema.employeeSalaries.deletedAt)
				)
			);
		return { ok: true };
	},
	deleteEmployee: async ({ params, platform }) => {
		if (!platform) return fail(500, { message: 'Cloudflare platform bindings are required' });
		const db = getDb(platform.env);
		const now = new Date().toISOString();
		await db
			.update(schema.employees)
			.set({ deletedAt: now, updatedAt: now, status: 'inactive' })
			.where(and(eq(schema.employees.id, params.id), isNull(schema.employees.deletedAt)));

		throw redirect(303, '/employees');
	}
};
