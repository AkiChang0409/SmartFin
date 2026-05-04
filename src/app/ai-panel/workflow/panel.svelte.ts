import type { IntakeHint, PanelMode, PanelOpenState, WorkflowId, WorkflowInstance } from './types';

/**
 * Global panel state. Single source of truth for:
 *  - whether the panel is open / closed / transitioning
 *  - half vs full coverage mode
 *  - which workflow (if any) is currently active in the middle layer
 *
 * Uses Svelte 5 runes inside a plain module — import the `panel` object
 * anywhere in the app to read/write state reactively.
 */

const STORAGE_KEY = 'sf.panel.v1';

interface PersistedState {
	open: boolean;
	mode: PanelMode;
}

function loadPersisted(): PersistedState {
	// Default to 'full' — the intake workflow needs the split layout
	// (fields left, preview right). Users can still toggle to half.
	if (typeof window === 'undefined') return { open: false, mode: 'full' };
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return { open: false, mode: 'full' };
		const parsed = JSON.parse(raw) as Partial<PersistedState>;
		return {
			open: parsed.open === true,
			mode: parsed.mode === 'half' ? 'half' : 'full'
		};
	} catch {
		return { open: false, mode: 'full' };
	}
}

function createPanel() {
	const persisted = loadPersisted();

	let openState = $state<PanelOpenState>(persisted.open ? 'open' : 'closed');
	let mode = $state<PanelMode>(persisted.mode);
	let activeWorkflow = $state<WorkflowInstance | null>(null);

	const isOpen = $derived(openState === 'open' || openState === 'opening');
	const isVisible = $derived(openState !== 'closed');

	function persist() {
		if (typeof window === 'undefined') return;
		const payload: PersistedState = {
			open: isOpen,
			mode
		};
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch {
			// sessionStorage may be unavailable (privacy mode); fail silent.
		}
	}

	function open() {
		if (openState === 'open' || openState === 'opening') return;
		openState = 'opening';
		// Wait for next paint so the closed clip-path is committed before expanding.
		window.requestAnimationFrame(() => {
			openState = 'open';
			persist();
		});
	}

	function close() {
		if (openState === 'closed' || openState === 'closing') return;
		openState = 'closing';
		persist();
		// Transition duration matches --panel-dur-portal (clip-path expand/collapse).
		window.setTimeout(() => {
			openState = 'closed';
		}, 480);
	}

	function toggle() {
		if (isOpen) close();
		else open();
	}

	function setMode(next: PanelMode) {
		mode = next;
		persist();
	}

	function toggleMode() {
		mode = mode === 'half' ? 'full' : 'half';
		persist();
	}

	function startWorkflow(workflowId: WorkflowId, hint?: IntakeHint) {
		// Hint biases bucket/category selection on the new workflow. Stored
		// in state so the active-flow components can read it without prop
		// drilling.
		const initialState: Record<string, unknown> = {};
		if (hint?.docType) initialState.hintDocType = hint.docType;
		if (hint?.categoryId) initialState.presetCategoryId = hint.categoryId;
		else if (hint?.docType) {
			// Legacy hint mapping → category id, so the new workflow's
			// KindStep can pre-select sensibly when only docType is given.
			const mapped = mapLegacyDocTypeToCategoryId(hint.docType);
			if (mapped) initialState.presetCategoryId = mapped;
		}
		activeWorkflow = {
			workflowId,
			startedAt: Date.now(),
			status: 'active',
			stepIndex: 0,
			state: initialState
		};
		open();
	}

	function mapLegacyDocTypeToCategoryId(docType: string): string | null {
		switch (docType) {
			case 'invoice_in':
				return 'expense.sales_cost.invoice';
			case 'expense':
				return 'expense.opex.others';
			case 'contract':
				return 'document_only.contract';
			case 'quotation':
				return 'document_only.quotation';
			case 'purchase_order':
				return 'document_only.purchase_order';
			case 'invoice_out':
				return 'revenue.invoice_out';
			default:
				return null;
		}
	}

	function endWorkflow() {
		activeWorkflow = null;
	}

	function setStep(next: number) {
		if (!activeWorkflow) return;
		activeWorkflow = { ...activeWorkflow, stepIndex: Math.max(0, next) };
	}

	function advanceStep() {
		if (!activeWorkflow) return;
		activeWorkflow = { ...activeWorkflow, stepIndex: activeWorkflow.stepIndex + 1 };
	}

	/** Merge a patch into the active workflow's state. Used by step components
	 *  to thread extracted data (file key, classify result, edited fields)
	 *  forward without exposing the whole store. */
	function patchState(patch: Record<string, unknown>) {
		if (!activeWorkflow) return;
		activeWorkflow = {
			...activeWorkflow,
			state: { ...(activeWorkflow.state as Record<string, unknown>), ...patch }
		};
	}

	return {
		get openState() {
			return openState;
		},
		get mode() {
			return mode;
		},
		get isOpen() {
			return isOpen;
		},
		get isVisible() {
			return isVisible;
		},
		get activeWorkflow() {
			return activeWorkflow;
		},
		open,
		close,
		toggle,
		setMode,
		toggleMode,
		startWorkflow,
		endWorkflow,
		setStep,
		advanceStep,
		patchState
	};
}

export const panel = createPanel();
