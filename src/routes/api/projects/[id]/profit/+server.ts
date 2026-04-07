import { and, eq, isNull, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { getDb, schema } from '$lib/server/db';
import { fail, ok } from '$lib/server/http';
import {
	projectExpenseCogsSumExpr,
	projectExpenseOpexSumExpr
} from '$lib/server/project-expense-sums';
import {
	staffCostPayoutJoinConditions,
	staffCostSumExpr
} from '$lib/server/project-staff-cost';

export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const db = getDb(platform.env);
	const [project] = await db
		.select({ id: schema.projects.id })
		.from(schema.projects)
		.where(and(eq(schema.projects.id, params.id), isNull(schema.projects.deletedAt)))
		.limit(1);

	if (!project) {
		return fail('Project not found', 404);
	}

	const [revenue] = await db
		.select({ total: sql<number>`coalesce(sum(${schema.invoicesOut.total}), 0)` })
		.from(schema.invoicesOut)
		.where(eq(schema.invoicesOut.projectId, params.id));
	const [purchaseCost] = await db
		.select({ total: sql<number>`coalesce(sum(${schema.invoicesIn.amount}), 0)` })
		.from(schema.invoicesIn)
		.where(eq(schema.invoicesIn.projectId, params.id));
	const [staffCost] = await db
		.select({ total: staffCostSumExpr() })
		.from(schema.payoutRecords)
		.innerJoin(
			schema.compensationComponents,
			eq(schema.payoutRecords.componentId, schema.compensationComponents.id)
		)
		.where(and(eq(schema.payoutRecords.projectId, params.id), staffCostPayoutJoinConditions()));
	const expenseWhere = and(eq(schema.expenses.projectId, params.id), isNull(schema.expenses.deletedAt));
	const [expenseCogsRow, expenseOpexRow] = await Promise.all([
		db.select({ total: projectExpenseCogsSumExpr() }).from(schema.expenses).where(expenseWhere),
		db.select({ total: projectExpenseOpexSumExpr() }).from(schema.expenses).where(expenseWhere)
	]);
	const expenseCogsCost = expenseCogsRow[0]?.total ?? 0;
	const expenseOpexCost = expenseOpexRow[0]?.total ?? 0;
	const expenseCost = expenseCogsCost + expenseOpexCost;

	const result = {
		revenue: revenue?.total ?? 0,
		purchaseCost: purchaseCost?.total ?? 0,
		staffCost: staffCost?.total ?? 0,
		expenseCost,
		expenseCogsCost,
		expenseOpexCost
	};

	const grossProfit =
		result.revenue - result.purchaseCost - result.staffCost - result.expenseCogsCost;
	const profit = grossProfit - result.expenseOpexCost;

	return ok({
		...result,
		grossProfit,
		profit
	});
};
