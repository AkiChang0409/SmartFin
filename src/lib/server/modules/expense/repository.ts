import { eq, isNull, and, sql, desc } from 'drizzle-orm';
import type { DBClient } from '../../db';
import { expenses, expenseCategories } from './schema';
import { BaseRepository } from '../base-repository';

// ---------------------------------------------------------------------------
// Expense cost layer SQL helpers (absorbed from project-expense-sums.ts)
// ---------------------------------------------------------------------------

/** Project-scoped expenses counted as direct cost (COGS) */
export const projectExpenseCogsSumExpr = () =>
	sql<number>`coalesce(sum(case when coalesce(${expenses.costLayer}, 'cogs') <> 'opex' then ${expenses.amount} else 0 end), 0)`;

/** Project-scoped expenses counted as operating / indirect (OpEx) */
export const projectExpenseOpexSumExpr = () =>
	sql<number>`coalesce(sum(case when ${expenses.costLayer} = 'opex' then ${expenses.amount} else 0 end), 0)`;

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

	/** Get COGS + OpEx breakdown for a project */
	async getProjectExpenseSums(projectId: string) {
		const rows = await this.db
			.select({
				cogs: projectExpenseCogsSumExpr(),
				opex: projectExpenseOpexSumExpr()
			})
			.from(expenses)
			.where(and(eq(expenses.projectId, projectId), isNull(expenses.deletedAt)));
		return { cogs: rows[0]?.cogs ?? 0, opex: rows[0]?.opex ?? 0 };
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
