import { desc, isNull, eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform) {
		return { reimbursements: [], total: 0 };
	}

	try {
		const db = getDb(platform.env);

		const reimbursements = await db
			.select({
				id: schema.expenses.id,
				expenseType: schema.expenses.expenseType,
				category: schema.expenses.category,
				amount: schema.expenses.amount,
				sgdEquivalent: schema.expenses.sgdEquivalent,
				currency: schema.expenses.currency,
				date: schema.expenses.date,
				vendorOrSupplier: schema.expenses.vendorOrSupplier,
				staffName: schema.expenses.staffName,
				destination: schema.expenses.destination,
				notes: schema.expenses.notes,
				projectId: schema.expenses.projectId,
				createdAt: schema.expenses.createdAt
			})
			.from(schema.expenses)
			.where(and(eq(schema.expenses.reimbursement, true), isNull(schema.expenses.deletedAt)))
			.orderBy(desc(schema.expenses.date), desc(schema.expenses.createdAt));

		const total = reimbursements.reduce((sum, r) => sum + (r.sgdEquivalent || r.amount || 0), 0);

		return { reimbursements, total };
	} catch (err) {
		console.error('[expenses/reimbursements] load failed', err);
		return { reimbursements: [], total: 0 };
	}
};
