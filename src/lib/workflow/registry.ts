import type { WorkflowDefinition, WorkflowId } from './types';

/**
 * Workflow registry. Phase 1A holds a single stub entry for
 * supplier-invoice-entry; Phase 1B will flesh out its step graph.
 */

const registry = new Map<WorkflowId, WorkflowDefinition>();

export function registerWorkflow(def: WorkflowDefinition): void {
	registry.set(def.id, def);
}

export function getWorkflow(id: WorkflowId): WorkflowDefinition | undefined {
	return registry.get(id);
}

export function listWorkflows(): WorkflowDefinition[] {
	return Array.from(registry.values());
}

registerWorkflow({
	id: 'supplier-invoice-entry',
	title: 'Record a supplier invoice',
	shortTitle: 'Supplier invoice',
	description: 'Drop a PDF or photo. We extract, match the PO, you confirm.',
	entryLabel: 'Record invoice',
	icon: 'receipt',
	steps: [
		{ id: 'upload', label: 'Drop file', hint: 'PDF, photo, or email' },
		{ id: 'detect', label: 'I read it', hint: 'OCR + extract' },
		{ id: 'confirm', label: 'Confirm match', hint: 'PO + amount + GST' },
		{ id: 'submit', label: 'Submit for approval', hint: 'Queue to approver' }
	]
});
