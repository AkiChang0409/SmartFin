import type { ModuleDefinition } from '../types';
import { registerExpenseHandlers } from './handlers';

export const expenseModule: ModuleDefinition = {
	manifest: {
		id: 'expense',
		name: 'Expense',
		layer: 'base',
		dependencies: ['core', 'project']
	},
	registerHandlers: registerExpenseHandlers
};

export { createExpenseApi, type ExpenseApi } from './api';
