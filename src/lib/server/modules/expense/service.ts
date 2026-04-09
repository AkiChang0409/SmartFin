import type { ModuleContext } from '../types';
import { ExpenseRepository, ExpenseCategoryRepository } from './repository';
import { createEvent } from '../event-bus';

// ---------------------------------------------------------------------------
// ExpenseService
// ---------------------------------------------------------------------------

export class ExpenseService {
	private repo: ExpenseRepository;
	private categoryRepo: ExpenseCategoryRepository;

	constructor(private ctx: ModuleContext) {
		this.repo = new ExpenseRepository(ctx.db);
		this.categoryRepo = new ExpenseCategoryRepository(ctx.db);
	}

	async getByProject(projectId: string) {
		return this.repo.findByProject(projectId);
	}

	async getProjectExpenseSums(projectId: string) {
		return this.repo.getProjectExpenseSums(projectId);
	}

	async create(data: {
		projectId: string;
		category: string;
		subcategory?: string;
		amount: number;
		currency?: string;
		date: string;
		costLayer?: string;
		attributionType?: string;
		personId?: string;
		staffName?: string;
		fileUrl?: string;
		ocrData?: string;
		metadata?: string;
	}) {
		const result = await this.repo.create({
			...data,
			currency: data.currency ?? 'SGD',
			costLayer: data.costLayer ?? 'cogs',
			attributionType: data.attributionType ?? 'direct'
		});

		await this.ctx.eventBus.emit(
			createEvent('expense.created', 'expense', {
				expenseId: result.id,
				projectId: data.projectId,
				amount: data.amount,
				costLayer: data.costLayer ?? 'cogs'
			})
		);

		return result;
	}

	async update(id: string, data: Record<string, unknown>) {
		return this.repo.update(id, data);
	}

	async softDelete(id: string) {
		const expense = await this.repo.findById(id);
		if (!expense) return;

		await this.repo.softDelete(id);

		await this.ctx.eventBus.emit(
			createEvent('expense.deleted', 'expense', {
				expenseId: id,
				projectId: expense.projectId
			})
		);
	}

	async getCategories() {
		return this.categoryRepo.findAll();
	}
}
