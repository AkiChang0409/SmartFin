import { eq, isNull, and, sql, desc } from 'drizzle-orm';
import type { DBClient } from '../../db';
import { expenses, revenue, expenseCategories } from './schema';
import { BaseRepository } from '../base-repository';

// ---------------------------------------------------------------------------
// Expense aggregation SQL helpers — redesigned for opex / sales_cost
// ---------------------------------------------------------------------------

/** Project-scoped operating expenses (expense_type = 'opex') */
export const projectExpenseOpexSumExpr = () =>
	sql<number>`coalesce(sum(case when ${expenses.expenseType} = 'opex' then coalesce(${expenses.sgdEquivalent}, ${expenses.amount}) else 0 end), 0)`;

/** Project-scoped sales cost (expense_type = 'sales_cost') */
export const projectExpenseSalesCostSumExpr = () =>
	sql<number>`coalesce(sum(case when ${expenses.expenseType} = 'sales_cost' then coalesce(${expenses.sgdEquivalent}, ${expenses.amount}) else 0 end), 0)`;

/** Total project expenses */
export const projectExpenseTotalSumExpr = () =>
	sql<number>`coalesce(sum(coalesce(${expenses.sgdEquivalent}, ${expenses.amount})), 0)`;

// ---------------------------------------------------------------------------
// ExpenseRepository
// ---------------------------------------------------------------------------

export class ExpenseRepository extends BaseRepository<typeof expenses> {
	constructor(db: DBClient) {
		super(db, expenses);
	}

	async findByProject(projectId: string) {
		return this.db
			.select()
			.from(expenses)
			.where(and(eq(expenses.projectId, projectId), isNull(expenses.deletedAt)))
			.orderBy(desc(expenses.date));
	}

	async getProjectExpenseSums(projectId: string) {
		const rows = await this.db
			.select({
				opex: projectExpenseOpexSumExpr(),
				salesCost: projectExpenseSalesCostSumExpr(),
				total: projectExpenseTotalSumExpr()
			})
			.from(expenses)
			.where(and(eq(expenses.projectId, projectId), isNull(expenses.deletedAt)));
		return {
			opex: rows[0]?.opex ?? 0,
			salesCost: rows[0]?.salesCost ?? 0,
			total: rows[0]?.total ?? 0
		};
	}
}

// ---------------------------------------------------------------------------
// RevenueRepository
// ---------------------------------------------------------------------------

export class RevenueRepository extends BaseRepository<typeof revenue> {
	constructor(db: DBClient) {
		super(db, revenue);
	}

	async findByProject(projectId: string) {
		return this.db
			.select()
			.from(revenue)
			.where(and(eq(revenue.projectId, projectId), isNull(revenue.deletedAt)))
			.orderBy(desc(revenue.date));
	}

	async getProjectRevenueTotal(projectId: string) {
		const rows = await this.db
			.select({
				total: sql<number>`coalesce(sum(coalesce(${revenue.sgdEquivalent}, ${revenue.amount})), 0)`
			})
			.from(revenue)
			.where(and(eq(revenue.projectId, projectId), isNull(revenue.deletedAt)));
		return rows[0]?.total ?? 0;
	}
}

// ---------------------------------------------------------------------------
// ExpenseCategoryRepository
// ---------------------------------------------------------------------------

export class ExpenseCategoryRepository extends BaseRepository<typeof expenseCategories> {
	constructor(db: DBClient) {
		super(db, expenseCategories);
	}
}
