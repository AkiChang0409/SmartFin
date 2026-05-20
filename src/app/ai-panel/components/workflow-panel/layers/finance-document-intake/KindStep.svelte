<script lang="ts">
	import { Sparkles } from 'lucide-svelte';
	import { panel } from '$app-layer/ai-panel/workflow/panel.svelte';
	import { advanceWorkflow, type WorkflowBucket } from '$app-layer/ai-panel/workflow/finance-workflow-api';
	import {
		FINANCE_CATEGORY_CATALOG,
		type CategoryDefinition
	} from '$modules/finance/workflows/financial-document-intake/categories';

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});
	const bucket = $derived<WorkflowBucket>(
		(wfState.selectedBucket as WorkflowBucket | undefined) ?? 'expense'
	);
	const presetCategoryId = $derived<string | undefined>(
		wfState.presetCategoryId as string | undefined
	);

	const options = $derived<CategoryDefinition[]>(
		FINANCE_CATEGORY_CATALOG.filter((c) => c.bucket === bucket)
	);
	const groupedOptions = $derived(groupByGroup(options));

	function groupByGroup(items: CategoryDefinition[]): Array<{ group: string; items: CategoryDefinition[] }> {
		const map = new Map<string, CategoryDefinition[]>();
		for (const item of items) {
			const group = item.group ?? 'All';
			const arr = map.get(group);
			if (arr) arr.push(item);
			else map.set(group, [item]);
		}
		return [...map.entries()].map(([group, list]) => ({ group, items: list }));
	}

	let selection = $state<string | null>(null);
	let advancing = $state(false);
	let error = $state('');

	$effect(() => {
		if (!selection && presetCategoryId) {
			const matched = options.find((c) => c.id === presetCategoryId);
			if (matched) selection = matched.id;
		}
		if (!selection && options[0]) selection = options[0].id;
	});

	function pick(id: string) {
		selection = id;
	}

	async function onContinue(categoryId: string) {
		const serverWorkflowId = wfState.serverWorkflowId as string | undefined;
		if (!serverWorkflowId) {
			error = 'Workflow lost its server id.';
			return;
		}
		advancing = true;
		try {
			const advance = await advanceWorkflow(serverWorkflowId, {
				targetStep: 'category_selection',
				payload: { categoryId }
			});
			panel.patchState({
				selectedCategoryId: categoryId,
				serverStep: advance.currentStep
			});
			panel.advanceStep();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not advance.';
		} finally {
			advancing = false;
		}
	}

	function onBack() {
		panel.setStep(1);
	}
</script>

<div class="step">
	<h3 class="step-title">What kind?</h3>
	<p class="step-sub">
		I'll extract <b>{bucket === 'expense' ? 'expense' : bucket === 'revenue' ? 'revenue' : 'reference'}</b>
		fields based on your pick.
	</p>

	<div class="groups">
		{#each groupedOptions as group (group.group)}
			<section class="group-block">
				{#if group.group !== 'All' && groupedOptions.length > 1}
					<header class="group-label">{group.group}</header>
				{/if}
				<ul class="cards">
					{#each group.items as opt (opt.id)}
						{@const isSelected = selection === opt.id}
						{@const isAiPick = presetCategoryId === opt.id}
						<li>
							<button
								type="button"
								class="row"
								class:is-selected={isSelected}
								onclick={() => pick(opt.id)}
								disabled={advancing}
							>
								<span class="row-main">
									<span class="row-name">
										{opt.label}
										{#if isAiPick}
											<span class="ai-pill" title="Pre-selected hint">
												<Sparkles size={9} strokeWidth={2} />
											</span>
										{/if}
									</span>
									{#if opt.sublabel}
										<span class="row-meta">{opt.sublabel}</span>
									{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>

	{#if error}
		<div class="err-line">{error}</div>
	{/if}

	<div class="actions">
		<button type="button" class="btn-ghost" onclick={onBack} disabled={advancing}>Back</button>
		<button
			type="button"
			class="btn-primary"
			onclick={() => selection && onContinue(selection)}
			disabled={!selection || advancing}
		>
			{advancing ? 'Going...' : 'Continue ->'}
		</button>
	</div>
</div>

<style>
	.step { display: flex; flex-direction: column; gap: 16px; }
	.step-title {
		font-size: 18px; font-weight: 500; color: var(--panel-fg); margin: 0;
	}
	.step-sub {
		font-size: 13px; color: var(--panel-fg-muted); margin: 0 0 6px 0;
	}
	.step-sub :global(b) { color: var(--panel-gold-bright); font-weight: 500; }

	.groups { display: flex; flex-direction: column; gap: 14px; }
	.group-label {
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--panel-gold);
		padding-bottom: 4px;
	}

	.cards {
		list-style: none; padding: 0; margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 8px;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		padding: 10px 14px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 10px;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.row:hover:not(:disabled) {
		border-color: var(--panel-gold);
		background: var(--panel-surface-raised);
	}
	.row:disabled { opacity: 0.5; cursor: not-allowed; }
	.row.is-selected {
		border-color: var(--panel-gold-bright);
		background: var(--panel-surface-raised);
		box-shadow: 0 0 14px -6px var(--panel-gold-glow);
	}

	.row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
	.row-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--panel-fg);
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.row-meta {
		font-size: 11px;
		color: var(--panel-fg-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ai-pill {
		display: inline-flex;
		width: 14px;
		height: 14px;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: rgba(234, 188, 60, 0.12);
		color: var(--panel-gold-bright);
	}

	.err-line { font-size: 12.5px; color: var(--panel-danger); }

	.actions {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	.btn-ghost, .btn-primary {
		padding: 9px 18px;
		border-radius: 10px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.btn-ghost {
		background: transparent;
		border: 1px solid var(--panel-border-strong);
		color: var(--panel-fg-muted);
	}
	.btn-ghost:hover:not(:disabled) { color: var(--panel-fg); border-color: var(--panel-gold); }
	.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
	.btn-primary {
		background: var(--panel-gold);
		border: 1px solid var(--panel-gold-bright);
		color: #2d1f08;
		box-shadow: 0 0 14px -3px var(--panel-gold-glow);
	}
	.btn-primary:hover:not(:disabled) { background: var(--panel-gold-bright); }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
