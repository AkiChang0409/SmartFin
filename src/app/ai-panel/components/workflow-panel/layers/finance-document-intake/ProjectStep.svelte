<script lang="ts">
	import { Briefcase, Building2 } from 'lucide-svelte';
	import { panel } from '$app-layer/ai-panel/workflow/panel.svelte';
	import { advanceWorkflow } from '$app-layer/ai-panel/workflow/finance-workflow-api';

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});
	const matching = $derived(wfState.matching as
		| { poCandidates?: Array<{ id: string; supplierName?: string }> }
		| undefined);
	/** If a PO match was selected upstream, propose using its supplier as a
	 *  hint for which project to link. Phase 4 keeps it manual â€?full project
	 *  picker lands in a follow-up. */
	const recommendedProject = $derived.by<{ id: string; label: string } | null>(() => {
		const poId = wfState.selectedPoId as string | undefined;
		const po = matching?.poCandidates?.find((c) => c.id === poId);
		return po
			? { id: `via-${poId}`, label: `Via PO ${po.id}${po.supplierName ? ` Â· ${po.supplierName}` : ''}` }
			: null;
	});

	let mode = $state<'company' | 'project'>('company');
	let projectIdInput = $state('');
	let advancing = $state(false);
	let error = $state('');

	async function onContinue() {
		const serverWorkflowId = wfState.serverWorkflowId as string | undefined;
		if (!serverWorkflowId) {
			error = 'Workflow lost its server id.';
			return;
		}
		const projectId =
			mode === 'project'
				? projectIdInput.trim() || (recommendedProject?.id ?? null)
				: null;
		advancing = true;
		try {
			const advance = await advanceWorkflow(serverWorkflowId, {
				targetStep: 'project_selection',
				payload: { projectId }
			});
			panel.patchState({
				selectedProjectId: projectId,
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
		panel.setStep(5);
	}
</script>

<div class="step">
	<h3 class="step-title">Link to a project?</h3>
	<p class="step-sub">
		Sales-cost expenses usually belong to a project; OPEX often doesn't. Skip if it's company-overhead.
	</p>

	<div class="mode-row">
		<button
			type="button"
			class="mode-card"
			class:is-selected={mode === 'company'}
			onclick={() => (mode = 'company')}
			disabled={advancing}
		>
			<span class="mode-icon"><Building2 size={18} strokeWidth={1.8} /></span>
			<span class="mode-body">
				<span class="mode-label">Company overhead</span>
				<span class="mode-sub">No project link</span>
			</span>
		</button>
		<button
			type="button"
			class="mode-card"
			class:is-selected={mode === 'project'}
			onclick={() => (mode = 'project')}
			disabled={advancing}
		>
			<span class="mode-icon"><Briefcase size={18} strokeWidth={1.8} /></span>
			<span class="mode-body">
				<span class="mode-label">Project</span>
				<span class="mode-sub">Link to a project</span>
			</span>
		</button>
	</div>

	{#if mode === 'project'}
		<div class="project-input">
			{#if recommendedProject}
				<div class="hint">
					<b>Suggested:</b> {recommendedProject.label}
				</div>
			{/if}
			<input
				type="text"
				placeholder="Project id or name (full picker lands later)"
				bind:value={projectIdInput}
				disabled={advancing}
			/>
		</div>
	{/if}

	{#if error}
		<div class="err-line">{error}</div>
	{/if}

	<div class="actions">
		<button type="button" class="btn-ghost" onclick={onBack} disabled={advancing}>Back</button>
		<button type="button" class="btn-primary" onclick={onContinue} disabled={advancing}>
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

	.mode-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.mode-card {
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
	.mode-card:hover:not(:disabled) {
		border-color: var(--panel-gold);
		background: var(--panel-surface-raised);
	}
	.mode-card:disabled { opacity: 0.5; cursor: not-allowed; }
	.mode-card.is-selected {
		border-color: var(--panel-gold-bright);
		background: var(--panel-surface-raised);
		box-shadow: 0 0 14px -6px var(--panel-gold-glow);
	}
	.mode-icon {
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
	.mode-body { display: flex; flex-direction: column; gap: 2px; }
	.mode-label { font-size: 13.5px; font-weight: 500; color: var(--panel-fg); }
	.mode-sub { font-size: 11.5px; color: var(--panel-fg-muted); }

	.project-input {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.hint {
		font-size: 12px;
		color: var(--panel-fg-muted);
		padding: 8px 12px;
		background: rgba(234, 188, 60, 0.06);
		border: 1px dashed rgba(234, 188, 60, 0.4);
		border-radius: 8px;
	}
	.hint :global(b) { color: var(--panel-gold-bright); font-weight: 500; }
	.project-input input {
		padding: 10px 14px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border-strong);
		border-radius: 10px;
		color: var(--panel-fg);
		font-family: inherit;
		font-size: 13px;
	}
	.project-input input:focus {
		outline: none;
		border-color: var(--panel-gold);
		box-shadow: 0 0 0 3px rgba(234, 188, 60, 0.12);
	}

	.err-line { font-size: 12.5px; color: var(--panel-danger); }

	.actions { display: flex; justify-content: space-between; gap: 10px; }
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
