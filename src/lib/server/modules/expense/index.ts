import type { ModuleDefinition } from '../types';
import { registerExpenseHandlers } from './handlers';
import type { AgentAction } from '$lib/server/agent/types';

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

export const expenseActions: AgentAction[] = [
	{
		id: 'view_expense_claims',
		module: 'expense',
		description: '查看费用记录（Operating Expenses 与 Sales Cost）',
		keywords: ['费用', 'expense', 'cost', 'opex', 'sales cost'],
		entry: '/expenses',
		layer: 1,
		required_roles: ['owner', 'finance', 'project_manager', 'employee']
	},
	{
		id: 'create_expense_record',
		module: 'expense',
		description: '录入费用记录（录入即确认，无草稿状态）',
		keywords: ['创建费用', '录入费用', 'new expense'],
		entry: '/expenses/upload',
		layer: 3,
		required_roles: ['owner', 'finance', 'project_manager'],
		params: [
			{ name: 'project_id', type: 'string', required: false, description: '项目ID（可选）', extract_from_context: true },
			{ name: 'amount', type: 'number', required: false, description: '费用金额' }
		]
	}
];
