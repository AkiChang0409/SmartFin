<script lang="ts">
	import { onMount } from 'svelte';
	import { Sparkles } from 'lucide-svelte';
	import { panel } from '$app-layer/ai-panel/workflow/panel.svelte';
	import {
		getKindOptions,
		resolveKindSelection,
		type Bucket,
		type KindOption
	} from '$modules/document-intake/schemas/intake-field-specs';

	type ClassifyResult = {
		bucket: Bucket;
		docType: string;
		category: string | null;
		expenseType: 'opex' | 'sales_cost' | null;
	};

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});
	const classifyResult = $derived(wfState.classifyResult as ClassifyResult | undefined);
	const selectedBucket = $derived(
		(wfState.selectedBucket as Bucket | undefined) ?? classifyResult?.bucket ?? 'expense'
	);

	const options = $derived(getKindOptions(selectedBucket));

	/** AI's pick translated to this step's kind-id space. */
	const aiPickId = $derived.by(() => {
		if (!classifyResult) return null;
		if (selectedBucket === 'revenue') return 'invoice_out';
		if (selectedBucket === 'expense') return classifyResult.category ?? 'others';
		return classifyResult.docType; // contract | quotation | purchase_order | other
	});

	let selection = $state<string | null>(null);

	$effect(() => {
		if (aiPickId && selection === null) {
			selection = aiPickId;
		}
	});

	// Revenue only has one option â€?auto-advance on mount so we don't
	// waste a step asking a single-option question.
	onMount(() => {
		if (selectedBucket === 'revenue') {
			// Short delay so the bubble still visually "ticks through".
			setTimeout(() => {
				advance('invoice_out');
			}, 450);
		}
	});

	function pick(id: string) {
		selection = id;
	}

	function advance(kindId: string) {
		const resolved = resolveKindSelection(selectedBucket, kindId);
		panel.patchState({
			selectedKind: kindId,
			selectedDocType: resolved.docType,
			selectedCategory: resolved.category,
			selectedExpenseType: resolved.expenseType,
			selectedCategoryDocType: resolved.docTypeForDocs
		});
		panel.advanceStep();
	}

	function onNext() {
		advance(selection ?? aiPickId ?? options[0]?.id ?? 'others');
	}

	function onSkip() {
		advance(aiPickId ?? options[0]?.id ?? 'others');
	}

	function onBack() {
		panel.setStep(2);
	}

	// Group for visual sub-sections (expense bucket has Project cost / Operating cost)
	const grouped = $derived.by(() => {
		const groups = new Map<string, KindOption[]>();
		for (const opt of options) {
			const key = opt.group ?? '';
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(opt);
		}
		return Array.from(groups.entries());
	});
</script>

{#if classifyResult}
	<div class="step">
		<h3 class="step-title">What kind?</h3>
		<p class="step-sub">
			{#if selectedBucket === 'revenue'}
				Only one option here â€?moving onâ€?			{:else if selectedBucket === 'expense'}
				Pick the category that fits, or let me decide.
			{:else}
				Pick the document type, or let me decide.
			{/if}
		</p>

		{#if selectedBucket === 'revenue'}
			<div class="revenue-flash">
				<span class="flash-bar"></span>
				<span>Recording as <b>Customer invoice</b></span>
			</div>
		{:else}
			{#each grouped as [groupName, opts], gi (groupName || gi)}
				{#if groupName}
					<div class="group-label">{groupName}</div>
				{/if}
				<div class="chip-grid">
					{#each opts as opt (opt.id)}
						<button
							type="button"
							class="kind-chip"
							class:is-selected={selection === opt.id}
							class:is-ai-pick={aiPickId === opt.id}
							onclick={() => pick(opt.id)}
						>
							<span class="kind-label">{opt.label}</span>
							{#if opt.sub}<span class="kind-sub">{opt.sub}</span>{/if}
							{#if aiPickId === opt.id}
								<span class="kind-ai-badge" title="AI's pick">
									<Sparkles size={9} strokeWidth={2.2} />
								</span>
							{/if}
						</button>
					{/each}
				</div>
			{/each}

			<div class="actions">
				<button type="button" class="btn-ghost" onclick={onBack}>Back</button>
				<div class="actions-right">
					<button type="button" class="btn-ghost" onclick={onSkip}>Let AI decide -></button>
					<button type="button" class="btn-primary" onclick={onNext}>Next -></button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.step-title {
		font-size: clamp(20px, 2.3vw, 24px);
		font-weight: 500;
		color: var(--panel-fg);
		margin: 0;
		letter-spacing: -0.005em;
	}
	.step-sub {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--panel-fg-muted);
		max-width: 52ch;
	}

	.group-label {
		margin-top: 6px;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--panel-fg-muted);
	}

	.chip-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
		gap: 10px;
	}

	.kind-chip {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 3px;
		padding: 11px 14px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
		color: var(--panel-fg);
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.kind-chip:hover {
		border-color: var(--panel-border-strong);
		background: var(--panel-surface-raised);
	}
	.kind-chip.is-ai-pick {
		border-color: rgba(234, 188, 60, 0.4);
	}
	.kind-chip.is-selected {
		border-color: var(--panel-gold);
		background: rgba(234, 188, 60, 0.1);
		box-shadow: 0 0 14px -4px var(--panel-gold-glow);
	}
	.kind-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--panel-fg);
	}
	.kind-sub {
		font-size: 11px;
		color: var(--panel-fg-muted);
	}
	.kind-ai-badge {
		position: absolute;
		top: 7px;
		right: 7px;
		display: inline-flex;
		width: 15px;
		height: 15px;
		align-items: center;
		justify-content: center;
		background: var(--panel-gold);
		border-radius: 999px;
		color: #2d1f08;
	}

	.revenue-flash {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 18px;
		background: rgba(234, 188, 60, 0.06);
		border: 1px solid rgba(234, 188, 60, 0.28);
		border-radius: 12px;
		font-size: 13px;
		color: var(--panel-fg-muted);
	}
	.revenue-flash :global(b) {
		color: var(--panel-gold-bright);
		font-weight: 500;
	}
	.flash-bar {
		position: relative;
		width: 30px;
		height: 1px;
		background: var(--panel-divider);
		overflow: hidden;
	}
	.flash-bar::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--panel-gold);
		animation: flash-fill 450ms linear forwards;
	}
	@keyframes flash-fill {
		from {
			width: 0;
		}
		to {
			width: 100%;
		}
	}

	.actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-top: 6px;
	}
	.actions-right {
		display: inline-flex;
		gap: 10px;
	}
	.btn-ghost {
		padding: 9px 14px;
		background: transparent;
		border: 1px solid var(--panel-border-strong);
		border-radius: 10px;
		color: var(--panel-fg-muted);
		font-family: inherit;
		font-size: 12.5px;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.btn-ghost:hover {
		color: var(--panel-gold-bright);
		border-color: var(--panel-gold);
	}
	.btn-primary {
		padding: 10px 18px;
		background: var(--panel-gold);
		border: 1px solid var(--panel-gold-bright);
		border-radius: 10px;
		color: #2d1f08;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		box-shadow: 0 0 18px -4px var(--panel-gold-glow);
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.btn-primary:hover {
		background: var(--panel-gold-bright);
		transform: translateY(-1px);
	}
</style>
