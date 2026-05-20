/**
 * Core workflow types. Kept deliberately minimal for Phase 1A —
 * we will expand once we have 2–3 real workflows and can see the shared shape.
 */

export type WorkflowId = string;

export type WorkflowStatus = 'idle' | 'active' | 'success' | 'aborted' | 'error';

export interface WorkflowStep {
	id: string;
	label: string;
	hint?: string;
}

export interface WorkflowDefinition {
	id: WorkflowId;
	title: string;
	shortTitle?: string;
	description: string;
	icon?: string;
	entryLabel: string;
	steps: WorkflowStep[];
}

export interface WorkflowInstance<TState = unknown> {
	workflowId: WorkflowId;
	startedAt: number;
	status: WorkflowStatus;
	stepIndex: number;
	state: TState;
}

export type PanelMode = 'half' | 'full';
export type PanelOpenState = 'closed' | 'opening' | 'open' | 'closing';

/**
 * Hint passed from an entry point (brief item / quick action) to bias the
 * workflow's bucket/category selection. The user can still override; treat
 * it as a prior, not a decision.
 *
 * - `docType` — legacy doc-intake hint (Phase 1A). Still drives the legacy
 *   `document-intake` flow's classifier.
 * - `categoryId` — Phase 3 hint, points at a canonical id from
 *   `src/modules/finance/workflows/financial-document-intake/categories.ts`
 *   (e.g. `expense.sales_cost.invoice`).
 */
export type IntakeHint = { docType?: string; categoryId?: string };

export interface BriefItem {
	id: string;
	title: string;
	detail: string;
	workflowId?: WorkflowId;
	workflowHint?: IntakeHint;
	urgency: 'normal' | 'due-soon' | 'overdue';
	count?: number;
}

export interface QuickAction {
	id: string;
	label: string;
	icon: string;
	workflowId?: WorkflowId;
	workflowHint?: IntakeHint;
}
