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

export interface BriefItem {
	id: string;
	title: string;
	detail: string;
	workflowId?: WorkflowId;
	urgency: 'normal' | 'due-soon' | 'overdue';
	count?: number;
}

export interface QuickAction {
	id: string;
	label: string;
	icon: string;
	workflowId?: WorkflowId;
}
