<script lang="ts">
	import { onMount } from 'svelte';
	import { panel } from '$app-layer/ai-panel/workflow/panel.svelte';
	import {
		advanceWorkflow,
		startAllowanceRecordingWorkflow,
		type AllowanceFormPayload
	} from '$app-layer/ai-panel/workflow/finance-workflow-api';

	/** Per-diem rate table â€?mirrors
	 *  src/modules/finance/workflows/allowance-recording/definition.ts */
	const DAILY_RATES: Record<string, number> = {
		China: 50,
		Malaysia: 45
	};

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});

	let staffName = $state('');
	let destination = $state('');
	let dateStart = $state('');
	let dateEnd = $state('');
	let dailyRate = $state(0);
	let manualRate = $state(false);

	const days = $derived.by<number>(() => {
		if (!dateStart || !dateEnd) return 0;
		const a = Date.parse(dateStart);
		const b = Date.parse(dateEnd);
		if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
		return Math.floor((b - a) / 86_400_000) + 1;
	});

	const totalAmount = $derived(Math.round(days * dailyRate * 100) / 100);

	const presetRate = $derived(DAILY_RATES[destination] ?? null);
	$effect(() => {
		if (!manualRate && presetRate !== null) dailyRate = presetRate;
	});

	let stage = $state<'idle' | 'starting' | 'submitting' | 'error'>('idle');
	let error = $state('');

	function payloadValid(): boolean {
		return Boolean(staffName && destination && dateStart && dateEnd && days > 0 && dailyRate > 0);
	}

	function buildPayload(): AllowanceFormPayload {
		return {
			staffName,
			destination,
			dateStart,
			dateEnd,
			days,
			dailyRate,
			currency: 'SGD'
		};
	}

	onMount(() => {
		// If the workflow hasn't been started server-side yet, start it now so
		// the form's manual_entry advance has a workflow id to attach to.
		const existing = wfState.serverWorkflowId as string | undefined;
		if (!existing) {
			void (async () => {
				try {
					stage = 'starting';
					const started = await startAllowanceRecordingWorkflow({ source: 'quick_action' });
					panel.patchState({
						serverWorkflowId: started.workflowId,
						serverStep: started.currentStep
					});
					stage = 'idle';
				} catch (e) {
					error = e instanceof Error ? e.message : 'Could not start allowance workflow.';
					stage = 'error';
				}
			})();
		}
	});

	async function onContinue() {
		if (!payloadValid()) {
			error = 'Fill staff, destination, dates, and a daily rate first.';
			stage = 'error';
			return;
		}
		const serverWorkflowId = wfState.serverWorkflowId as string | undefined;
		if (!serverWorkflowId) {
			error = 'Workflow lost its server id.';
			stage = 'error';
			return;
		}
		stage = 'submitting';
		try {
			const entry = buildPayload();
			const advance = await advanceWorkflow(serverWorkflowId, {
				targetStep: 'manual_entry',
				payload: { allowanceEntry: entry }
			});
			panel.patchState({
				serverStep: advance.currentStep,
				allowanceEntry: entry,
				allowanceTotal: totalAmount
			});

			// Pre-advance to user_confirmation so the next step's Confirm button is the only gate.
			const advance2 = await advanceWorkflow(serverWorkflowId, {
				targetStep: 'user_confirmation'
			});
			panel.patchState({ serverStep: advance2.currentStep });
			panel.advanceStep();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not advance.';
			stage = 'error';
		}
	}
</script>

<div class="step">
	<h3 class="step-title">Per-diem allowance</h3>
	<p class="step-sub">No file needed. Days x daily rate auto-computes.</p>

	<div class="grid">
		<label class="field">
			<span>Staff</span>
			<input type="text" bind:value={staffName} placeholder="Joyce Lee" />
		</label>

		<label class="field">
			<span>Destination</span>
			<input type="text" bind:value={destination} placeholder="China / Malaysia / ..." list="dest-list" />
			<datalist id="dest-list">
				<option value="China">China</option>
				<option value="Malaysia">Malaysia</option>
			</datalist>
		</label>

		<label class="field">
			<span>From</span>
			<input type="date" bind:value={dateStart} />
		</label>

		<label class="field">
			<span>To</span>
			<input type="date" bind:value={dateEnd} />
		</label>

		<div class="field">
			<span>Days</span>
			<div class="static">{days || '-'}</div>
		</div>

		<label class="field">
			<span>Daily rate (SGD)</span>
			<input
				type="number"
				step="0.01"
				bind:value={dailyRate}
				oninput={() => (manualRate = true)}
			/>
			{#if presetRate !== null && !manualRate}
				<span class="hint">Auto from {destination}</span>
			{/if}
		</label>
	</div>

	<div class="total-row">
		<span>Total</span>
		<span class="total">SGD {totalAmount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
	</div>

	{#if stage === 'error'}
		<div class="err-line">{error}</div>
	{/if}

	<div class="actions">
		<button
			type="button"
			class="btn-primary"
			onclick={onContinue}
			disabled={!payloadValid() || stage === 'submitting' || stage === 'starting'}
		>
			{stage === 'submitting' || stage === 'starting' ? 'Going...' : 'Continue ->'}
		</button>
	</div>
</div>

<style>
	.step { display: flex; flex-direction: column; gap: 16px; }
	.step-title { font-size: 18px; font-weight: 500; color: var(--panel-fg); margin: 0; }
	.step-sub { font-size: 13px; color: var(--panel-fg-muted); margin: 0 0 6px 0; }

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px 14px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
		color: var(--panel-fg-muted);
	}
	.field > span:first-child {
		font-size: 11.5px;
		letter-spacing: 0.04em;
		color: var(--panel-fg-faint);
		text-transform: uppercase;
	}
	.field input {
		padding: 8px 12px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border-strong);
		border-radius: 8px;
		color: var(--panel-fg);
		font-family: inherit;
		font-size: 13px;
	}
	.field input:focus {
		outline: none;
		border-color: var(--panel-gold);
		box-shadow: 0 0 0 3px rgba(234, 188, 60, 0.12);
	}
	.field .static {
		padding: 8px 12px;
		background: var(--panel-surface-raised);
		border: 1px solid var(--panel-border);
		border-radius: 8px;
		color: var(--panel-fg);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.hint { font-size: 11px; color: var(--panel-gold-bright); }

	.total-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 12px 16px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
	}
	.total-row > span:first-child {
		font-size: 11.5px;
		letter-spacing: 0.04em;
		color: var(--panel-fg-faint);
		text-transform: uppercase;
	}
	.total {
		font-size: 18px;
		font-weight: 500;
		color: var(--panel-gold-bright);
		font-variant-numeric: tabular-nums;
	}

	.err-line { font-size: 12.5px; color: var(--panel-danger); }

	.actions { display: flex; justify-content: flex-end; gap: 10px; }
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
