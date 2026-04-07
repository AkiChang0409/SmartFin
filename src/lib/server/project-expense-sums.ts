import { sql } from 'drizzle-orm';

import { schema } from '$lib/server/db';

/** Project-scoped expenses counted as direct cost (COGS); default layer is cogs. */
export const projectExpenseCogsSumExpr = () =>
	sql<number>`coalesce(sum(case when coalesce(${schema.expenses.costLayer}, 'cogs') <> 'opex' then ${schema.expenses.amount} else 0 end), 0)`;

/** Project-scoped expenses counted as operating / indirect (OpEx). */
export const projectExpenseOpexSumExpr = () =>
	sql<number>`coalesce(sum(case when ${schema.expenses.costLayer} = 'opex' then ${schema.expenses.amount} else 0 end), 0)`;
