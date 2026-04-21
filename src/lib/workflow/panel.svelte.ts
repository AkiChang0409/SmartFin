import type { PanelMode, PanelOpenState, WorkflowId, WorkflowInstance } from './types';

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
	if (typeof window === 'undefined') return { open: false, mode: 'half' };
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return { open: false, mode: 'half' };
		const parsed = JSON.parse(raw) as Partial<PersistedState>;
		return {
			open: parsed.open === true,
			mode: parsed.mode === 'full' ? 'full' : 'half'
		};
	} catch {
		return { open: false, mode: 'half' };
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
		// Allow one frame for mount, then flip to open for CSS transition completeness.
		queueMicrotask(() => {
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

	function startWorkflow(workflowId: WorkflowId) {
		activeWorkflow = {
			workflowId,
			startedAt: Date.now(),
			status: 'active',
			stepIndex: 0,
			state: {}
		};
		open();
	}

	function endWorkflow() {
		activeWorkflow = null;
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
		endWorkflow
	};
}

export const panel = createPanel();
