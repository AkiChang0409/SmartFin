import type { ModuleContext } from '../types';
import { ExpenseService } from './service';

export type ExpenseApi = ReturnType<typeof createExpenseApi>;

export function createExpenseApi(ctx: ModuleContext) {
	const svc = new ExpenseService(ctx);

	return {
		getByProject: svc.getByProject.bind(svc),
		getProjectExpenseSums: svc.getProjectExpenseSums.bind(svc),
		create: svc.create.bind(svc),
		update: svc.update.bind(svc),
		softDelete: svc.softDelete.bind(svc),
		getCategories: svc.getCategories.bind(svc)
	};
}
