<script lang="ts">
	import { ArrowLeft, UploadCloud } from 'lucide-svelte';
	import { panel } from '$lib/workflow/panel.svelte';
	import { getWorkflow } from '$lib/workflow/registry';

	const workflow = $derived(
		panel.activeWorkflow ? getWorkflow(panel.activeWorkflow.workflowId) : undefined
	);
</script>

<section class="flow">
	<button type="button" class="flow-back" onclick={() => panel.endWorkflow()}>
		<ArrowLeft size={14} strokeWidth={2} />
		<span>Back to today</span>
	</button>

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
		     conversational confirm surface. For 1A we just hint at the shape. -->
		<div class="stage">
			<div class="stage-glow" aria-hidden="true"></div>
			<div class="stage-icon">
				<UploadCloud size={28} strokeWidth={1.6} />
			</div>
			<div class="stage-heading">Drop a file here</div>
			<div class="stage-sub">
				PDF, photo, or email attachment — I'll read it, match the PO,
				and show you a draft in seconds.
			</div>
			<div class="stage-footnote">Phase 1B — this is where the real flow lands.</div>
		</div>
	{/if}
</section>

<style>
	.flow {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.flow-back {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px 6px 10px;
		background: transparent;
		border: 1px solid var(--panel-border);
		border-radius: 999px;
		font-family: inherit;
		font-size: 12px;
		color: var(--panel-fg-muted);
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.flow-back:hover {
		background: rgba(234, 188, 60, 0.06);
		color: var(--panel-gold-bright);
		border-color: var(--panel-border-strong);
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
		margin-top: 8px;
		padding: 40px 28px 36px;
		text-align: center;
		background: var(--panel-surface);
		border: 1px dashed rgba(234, 188, 60, 0.28);
		border-radius: 18px;
		overflow: hidden;
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
