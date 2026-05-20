<script lang="ts">
	import { ArrowDownLeft, ArrowUpRight, FolderArchive, Sparkles } from 'lucide-svelte';
	import { panel } from '$app-layer/ai-panel/workflow/panel.svelte';
	import { advanceWorkflow, type WorkflowBucket } from '$app-layer/ai-panel/workflow/finance-workflow-api';

	interface BucketChoice {
		id: WorkflowBucket;
		label: string;
		sublabel: string;
	}
	const BUCKETS: BucketChoice[] = [
		{ id: 'expense', label: 'Expense', sublabel: 'We paid out' },
		{ id: 'revenue', label: 'Revenue', sublabel: 'Customer paid us' },
		{ id: 'document_only', label: 'Archive', sublabel: 'Just file it' }
	];

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});
	/** AI's preliminary inference. Used to highlight a default chip. */
	const aiPick = $derived.by<WorkflowBucket | null>(() => {
		const cls = wfState.documentClassification as
			| { documentType?: string }
			| undefined;
		const dt = cls?.documentType;
		if (!dt) return null;
		if (dt === 'customer_invoice') return 'revenue';
		if (dt === 'contract' || dt === 'quotation' || dt === 'purchase_order') {
			return 'document_only';
		}
		return 'expense';
	});

	let selection = $state<WorkflowBucket | null>(null);
	let advancing = $state(false);
	let error = $state('');

	$effect(() => {
		if (!selection && aiPick) selection = aiPick;
	});

	function pick(b: WorkflowBucket) {
		selection = b;
	}

	async function onContinue(targetBucket: WorkflowBucket) {
		const serverWorkflowId = wfState.serverWorkflowId as string | undefined;
		if (!serverWorkflowId) {
			error = 'Workflow lost its server id.';
			return;
		}
		advancing = true;
		try {
			const advance = await advanceWorkflow(serverWorkflowId, {
				targetStep: 'bucket_selection',
				payload: { bucket: targetBucket }
			});
			panel.patchState({
				selectedBucket: targetBucket,
				serverStep: advance.currentStep
			});
			panel.advanceStep();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not advance.';
		} finally {
			advancing = false;
		}
	}

	function iconFor(b: WorkflowBucket) {
		if (b === 'revenue') return ArrowDownLeft;
		if (b === 'expense') return ArrowUpRight;
		return FolderArchive;
	}
</script>

<div class="step">
	{#if aiPick}
		<div class="step-narration">
			<span class="narration-eyebrow">
				<Sparkles size={11} strokeWidth={2} /> I think
			</span>
			<span class="narration-text">
				This looks like a <b>{aiPick === 'expense' ? 'expense' : aiPick === 'revenue' ? 'revenue' : 'reference document'}</b>. Confirm or override.
			</span>
		</div>
	{/if}

	<h3 class="step-title">Where does this go?</h3>
	<p class="step-sub">Pick the right bucket â€?drives which fields I'll extract next.</p>

	<div class="chip-row">
		{#each BUCKETS as opt (opt.id)}
			{@const Icon = iconFor(opt.id)}
			<button
				type="button"
				class="chip"
				class:is-selected={selection === opt.id}
				class:is-ai-pick={aiPick === opt.id}
				onclick={() => pick(opt.id)}
				disabled={advancing}
			>
				<span class="chip-icon"><Icon size={16} strokeWidth={2} /></span>
				<span class="chip-body">
					<span class="chip-label">{opt.label}</span>
					<span class="chip-sub">{opt.sublabel}</span>
				</span>
				{#if aiPick === opt.id}
					<span class="chip-ai-badge" title="AI's pick">
						<Sparkles size={10} strokeWidth={2} />
					</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if error}
		<div class="err-line">{error}</div>
	{/if}

	<div class="actions">
		<button
			type="button"
			class="btn-primary"
			disabled={!selection || advancing}
			onclick={() => selection && onContinue(selection)}
		>
			{advancing ? 'Going...' : 'Continue ->'}
		</button>
	</div>
</div>

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.step-narration {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
		font-size: 13.5px;
		color: var(--panel-fg);
	}
	.narration-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--panel-gold);
	}
	.narration-text { color: var(--panel-fg-muted); line-height: 1.5; }
	.narration-text :global(b) { color: var(--panel-fg); font-weight: 500; }

	.step-title {
		font-size: 18px;
		font-weight: 500;
		color: var(--panel-fg);
		margin: 0;
	}
	.step-sub {
		font-size: 13px;
		color: var(--panel-fg-muted);
		margin: 0 0 6px 0;
	}

	.chip-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 10px;
	}

	.chip {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.chip:hover:not(:disabled) {
		border-color: var(--panel-gold);
		background: var(--panel-surface-raised);
	}
	.chip:disabled { opacity: 0.5; cursor: not-allowed; }
	.chip.is-selected {
		border-color: var(--panel-gold-bright);
		background: var(--panel-surface-raised);
		box-shadow: 0 0 18px -6px var(--panel-gold-glow);
	}
	.chip-icon {
		display: inline-flex;
		width: 32px;
		height: 32px;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: rgba(234, 188, 60, 0.08);
		color: var(--panel-gold-bright);
		flex-shrink: 0;
	}
	.chip-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
	.chip-label { font-size: 13.5px; font-weight: 500; color: var(--panel-fg); }
	.chip-sub { font-size: 11.5px; color: var(--panel-fg-muted); }
	.chip-ai-badge {
		position: absolute;
		top: 8px;
		right: 8px;
		display: inline-flex;
		width: 16px;
		height: 16px;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(234, 188, 60, 0.12);
		color: var(--panel-gold-bright);
	}

	.err-line {
		font-size: 12.5px;
		color: var(--panel-danger);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}
	.btn-primary {
		padding: 9px 18px;
		border-radius: 10px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		background: var(--panel-gold);
		border: 1px solid var(--panel-gold-bright);
		color: #2d1f08;
		box-shadow: 0 0 14px -3px var(--panel-gold-glow);
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.btn-primary:hover:not(:disabled) { background: var(--panel-gold-bright); }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
