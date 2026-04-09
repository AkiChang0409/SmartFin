import type { ModuleContext } from '../types';

/**
 * DashboardService provides company-wide financial overview.
 * It reads from other module APIs to aggregate data.
 */
export class DashboardService {
	constructor(private ctx: ModuleContext) {}

	/**
	 * Get dashboard overview. Accepts pre-computed module data
	 * to avoid circular imports.
	 */
	async getOverview(deps: {
		getProjectsList: () => Promise<{ id: string; name: string; customerId: string }[]>;
		getProjectFinancials: (projectId: string) => Promise<{
			revenue: number;
			purchaseCost: number;
			staffCost: number;
			expenseCogs: number;
			expenseOpex: number;
			grossProfit: number;
			netProfit: number;
		}>;
	}) {
		const projects = await deps.getProjectsList();
		const financials = await Promise.all(
			projects.map(async (p) => ({
				projectId: p.id,
				projectName: p.name,
				...(await deps.getProjectFinancials(p.id))
			}))
		);

		const totals = financials.reduce(
			(acc, f) => ({
				totalRevenue: acc.totalRevenue + f.revenue,
				totalCost: acc.totalCost + f.purchaseCost + f.staffCost + f.expenseCogs + f.expenseOpex,
				totalGrossProfit: acc.totalGrossProfit + f.grossProfit,
				totalNetProfit: acc.totalNetProfit + f.netProfit
			}),
			{ totalRevenue: 0, totalCost: 0, totalGrossProfit: 0, totalNetProfit: 0 }
		);

		return { projects: financials, ...totals };
	}
}

/**
 * ProfitReportService generates profit reports.
 */
export class ProfitReportService {
	constructor(private ctx: ModuleContext) {}
	// Will be populated when route handlers are refactored
}
