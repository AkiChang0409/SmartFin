export const financeWorkspaceEntries = [
	{ id: 'finance.workspace', route: '/finance/dashboard', label: 'Finance Workspace' }
] as const;

export const financeDashboardCards = [
	'company-financial-overview',
	'dashboard-charts',
	'projects-profit-ranking'
] as const;

export const financeNavigationEntries = [
	'/finance/doc-hub',
	'/finance/expenses',
	'/finance/tax',
	'/finance/dashboard'
] as const;

/**
 * Workflows surfaced through the AI Panel's task-mode entry list. Phase 3
 * collapsed expense-recording and finance-document-intake into the unified
 * `financial-document-intake` flow; allowance is the only carve-out (no
 * document). vendor-invoice-intake is kept here for backward compat with
 * Phase 1+2 demos.
 */
export const financeTaskModeEntries = [
	'financial-document-intake',
	'vendor-invoice-intake',
	'allowance-recording'
] as const;

export const financeAppSurface = {
	workspaces: financeWorkspaceEntries,
	dashboardCards: financeDashboardCards,
	navigation: financeNavigationEntries,
	taskModeEntries: financeTaskModeEntries
};
