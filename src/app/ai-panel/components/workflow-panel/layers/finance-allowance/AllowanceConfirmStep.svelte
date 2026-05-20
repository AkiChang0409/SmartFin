<script lang="ts">
	import { ShieldCheck, Loader2 } from 'lucide-svelte';
	import { panel } from '$app-layer/ai-panel/workflow/panel.svelte';
	import {
		confirmAllowanceWorkflow,
		type AllowanceConfirmPayload,
		type AllowanceFormPayload
	} from '$app-layer/ai-panel/workflow/finance-workflow-api';
	import { hashConfirmationPayload } from '$platform/workflow/payload-hash';

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});
	const entry = $derived(wfState.allowanceEntry as AllowanceFormPayload | undefined);
	const total = $derived((wfState.allowanceTotal as number | undefined) ?? 0);
	const serverWorkflowId = $derived(wfState.serverWorkflowId as string | undefined);

	let stage = $state<'idle' | 'submitting' | 'error'>('idle');
	let errorMessage = $state('');

	function buildPayload(): AllowanceConfirmPayload | null {
		if (!entry) return null;
		return { ...entry, totalAmount: total };
	}

	async function onConfirm() {
		const payload = buildPayload();
		if (!payload || !serverWorkflowId) {
			errorMessage = 'Missing data â€?go back and refill the form.';
			stage = 'error';
			return;
		}
		stage = 'submitting';
		errorMessage = '';
		try {
			const allowancePayloadHash = await hashConfirmationPayload(payload);
			const result = await confirmAllowanceWorkflow(serverWorkflowId, {
				allowancePayload: payload,
				allowancePayloadHash
			});
			panel.patchState({
				entityId: result.entityId,
				auditRef: result.auditRef,
				entityRoute: result.entityRoute,
				nextTask: result.nextTask,
				serverStep: 'completion'
			});
			panel.advanceStep();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Could not record allowance.';
			stage = 'error';
		}
	}

	function onEdit() { panel.setStep(0); }
	function onCancel() { panel.endWorkflow(); panel.close(); }
</script>

{#if entry}
	<div class="step">
		<div class="lede">
			<span class="lede-eyebrow">
				<ShieldCheck size={11} strokeWidth={2} /> Final review
			</span>
			<span class="lede-text">
				About to record this allowance. <b>SGD {total.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> total.
			</span>
		</div>

		<div class="summary-card">
			<dl class="summary">
				<div class="row"><dt>Staff</dt><dd>{entry.staffName}</dd></div>
				<div class="row"><dt>Destination</dt><dd>{entry.destination}</dd></div>
				<div class="row"><dt>From</dt><dd class="num">{entry.dateStart}</dd></div>
				<div class="row"><dt>To</dt><dd class="num">{entry.dateEnd}</dd></div>
				<div class="row"><dt>Days</dt><dd class="num">{entry.days}</dd></div>
				<div class="row"><dt>Daily rate</dt><dd class="num">SGD {entry.dailyRate.toFixed(2)}</dd></div>
				<div class="row emphasis">
					<dt>Total</dt>
					<dd class="num">SGD {total.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
				</div>
			</dl>
		</div>

		{#if stage === 'error'}
			<div class="err-card">
				<div class="err-title">Couldn't record</div>
				<p class="err-sub">{errorMessage}</p>
			</div>
		{/if}

		<div class="actions">
			<button type="button" class="btn-ghost" onclick={onCancel} disabled={stage === 'submitting'}>Cancel</button>
			<button type="button" class="btn-ghost" onclick={onEdit} disabled={stage === 'submitting'}>â†?Edit</button>
			<button type="button" class="btn-primary" onclick={onConfirm} disabled={stage === 'submitting'}>
				{#if stage === 'submitting'}
					<Loader2 size={14} strokeWidth={2} class="spin" /> Recordingâ€?				{:else}
					Confirm and record
				{/if}
			</button>
		</div>
	</div>
{:else}
	<div class="empty">No allowance entry yet. Step back to the form.</div>
{/if}

<style>
	.step { display: flex; flex-direction: column; gap: 18px; }

	.lede {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 14px;
		font-size: 13.5px;
		color: var(--panel-fg);
	}
	.lede-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--panel-gold);
	}
	.lede-text { flex: 1; color: var(--panel-fg-muted); line-height: 1.5; }
	.lede-text :global(b) { color: var(--panel-fg); font-weight: 500; }

	.summary-card {
		padding: 18px 22px 22px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 16px;
	}
	.summary {
		display: grid;
		grid-template-columns: 130px 1fr;
		row-gap: 11px;
		column-gap: 14px;
		margin: 0;
	}
	.row { display: contents; }
	.row dt {
		font-size: 11.5px;
		letter-spacing: 0.04em;
		color: var(--panel-fg-faint);
		text-transform: uppercase;
		align-self: center;
	}
	.row dd { font-size: 13.5px; color: var(--panel-fg); margin: 0; }
	.row dd.num { font-variant-numeric: tabular-nums; }
	.row.emphasis dd {
		font-size: 16px;
		font-weight: 500;
		color: var(--panel-gold-bright);
	}

	.err-card {
		padding: 14px 16px;
		background: rgba(225, 118, 118, 0.06);
		border: 1px solid rgba(225, 118, 118, 0.32);
		border-radius: 12px;
	}
	.err-title { font-size: 13.5px; font-weight: 500; color: var(--panel-fg); margin-bottom: 4px; }
	.err-sub { font-size: 12.5px; color: var(--panel-fg-muted); margin: 0; }

	.actions { display: flex; justify-content: flex-end; gap: 10px; }
	.btn-ghost, .btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 6px;
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
	.btn-primary:disabled { opacity: 0.7; cursor: progress; }
	.btn-primary :global(svg.spin) { animation: spin 1.1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.empty {
		padding: 32px;
		text-align: center;
		font-size: 13.5px;
		color: var(--panel-fg-muted);
	}
</style>
