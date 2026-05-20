import type { FinanceIntent } from './types';

/**
 * Phase 3 binding shape — every intent maps to a concrete workflow id plus
 * an optional `categoryId` hint that pre-selects the unified
 * `financial-document-intake` workflow's bucket/category.
 *
 * The Phase-1 design split intents across many distinct workflows
 * (vendor-invoice-intake, expense-recording, receipt-intake, …). The
 * expense/revenue design doc §1.2 (统一入口) says all expense+revenue+archive
 * intake should run through one workflow with category branching. The only
 * intent that genuinely needs its own workflow is `record_allowance` —
 * there's no document, so the upload/extract steps don't apply.
 */
export interface WorkflowBinding {
	workflowId: string;
	/** Canonical category id from `financial-document-intake/categories.ts`. */
	categoryId?: string;
}

export const financeWorkflowBinding: Record<FinanceIntent, WorkflowBinding | null> = {
	record_supplier_invoice: {
		workflowId: 'financial-document-intake',
		categoryId: 'expense.sales_cost.invoice'
	},
	record_expense: {
		workflowId: 'financial-document-intake',
		categoryId: 'expense.opex.others'
	},
	record_receipt: {
		workflowId: 'financial-document-intake',
		categoryId: 'expense.sales_cost.receipt'
	},
	record_allowance: { workflowId: 'allowance-recording' },
	record_revenue: {
		workflowId: 'financial-document-intake',
		categoryId: 'revenue.invoice_out'
	},
	prepare_gst_review: { workflowId: 'gst-review-preparation' },

	query_expense_summary: null,
	query_revenue_summary: null,
	query_profit_summary: null,
	explain_finance_record: null,
	detect_possible_duplicate: null,
	suggest_next_finance_task: null,
	unknown: null
};

export function resolveWorkflowForIntent(intent: FinanceIntent): WorkflowBinding | null {
	return financeWorkflowBinding[intent];
}
