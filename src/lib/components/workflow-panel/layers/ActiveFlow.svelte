<script lang="ts">
	import { UploadCloud } from 'lucide-svelte';
	import { panel } from '$lib/workflow/panel.svelte';
	import { getWorkflow } from '$lib/workflow/registry';

	const workflow = $derived(
		panel.activeWorkflow ? getWorkflow(panel.activeWorkflow.workflowId) : undefined
	);
	const stepIndex = $derived(panel.activeWorkflow?.stepIndex ?? 0);
	const currentStep = $derived(workflow?.steps?.[stepIndex]);
	const isLast = $derived(
		!!workflow && stepIndex >= (workflow.steps.length - 1)
	);

	// Phase 1A stub: clicking the stage advances the demo so the TaskLine
	// bubbles move. Real step logic (OCR, matching, approval) lands in 1B.
	function onStageClick() {
		if (isLast) {
			panel.endWorkflow();
			return;
		}
		panel.advanceStep();
	}
</script>

<section class="flow">
	{#if workflow}
		<div class="flow-intro">
			<div class="flow-eyebrow">
				<span class="flow-eyebrow-dot"></span>
				Quest in progress
			</div>
			<h2 class="flow-title">{workflow.title}</h2>
			<p class="flow-sub">{workflow.description}</p>
		</div>

		<!-- Phase 1B placeholder stage: this becomes the drag-drop + OCR +
		     conversational confirm surface. For 1A tapping it just advances
		     the TaskLine so the bubble metaphor reads end-to-end. -->
		<button type="button" class="stage" onclick={onStageClick}>
			<span class="stage-glow" aria-hidden="true"></span>
			<span class="stage-icon">
				<UploadCloud size={28} strokeWidth={1.6} />
			</span>
			<span class="stage-heading">
				{currentStep?.label ?? 'Drop a file here'}
			</span>
			<span class="stage-sub">
				{#if currentStep?.hint}
					{currentStep.hint}
				{:else}
					PDF, photo, or email attachment — I'll read it, match the PO,
					and show you a draft in seconds.
				{/if}
			</span>
			<span class="stage-footnote">
				{isLast ? 'Tap to finish and return to today' : 'Tap to advance (Phase 1A stub)'}
			</span>
		</button>
	{/if}
</section>

<style>
	.flow {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.flow-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--panel-gold);
		margin-bottom: 10px;
	}
	.flow-eyebrow-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--panel-gold);
		box-shadow: 0 0 10px var(--panel-gold-glow);
	}

	.flow-title {
		font-size: clamp(22px, 2.6vw, 30px);
		font-weight: 500;
		line-height: 1.25;
		color: var(--panel-fg);
		margin: 0 0 8px 0;
		letter-spacing: -0.01em;
	}
	.flow-sub {
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--panel-fg-muted);
		margin: 0;
		max-width: 52ch;
	}

	.stage {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 8px;
		padding: 40px 28px 36px;
		text-align: center;
		background: var(--panel-surface);
		border: 1px dashed rgba(234, 188, 60, 0.28);
		border-radius: 18px;
		overflow: hidden;
		color: inherit;
		font-family: inherit;
		cursor: pointer;
		width: 100%;
		transition:
			transform var(--panel-dur-fast) var(--panel-ease),
			border-color var(--panel-dur-fast) var(--panel-ease),
			background var(--panel-dur-fast) var(--panel-ease);
	}
	.stage:hover {
		transform: translateY(-1px);
		border-color: var(--panel-gold);
		background: var(--panel-surface-raised);
	}
	.stage:active {
		transform: translateY(0);
	}
	.stage-glow {
		position: absolute;
		inset: -30% -30% auto auto;
		width: 60%;
		height: 80%;
		background: radial-gradient(circle, var(--panel-gold-soft), transparent 60%);
		pointer-events: none;
	}
	.stage-icon {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		margin-bottom: 16px;
		color: var(--panel-gold-bright);
		background: rgba(234, 188, 60, 0.08);
		border: 1px solid rgba(234, 188, 60, 0.22);
		border-radius: 16px;
		box-shadow: 0 0 24px -4px var(--panel-gold-glow);
	}
	.stage-heading {
		position: relative;
		font-size: clamp(20px, 2.4vw, 26px);
		font-weight: 500;
		color: var(--panel-fg);
		margin-bottom: 8px;
		letter-spacing: -0.01em;
	}
	.stage-sub {
		position: relative;
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--panel-fg-muted);
		max-width: 44ch;
		margin: 0 auto;
	}
	.stage-footnote {
		position: relative;
		margin-top: 18px;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--panel-fg-faint);
	}
</style>
