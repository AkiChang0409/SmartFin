<script lang="ts">
	import { panel } from '$lib/workflow/panel.svelte';
	import { getWorkflow } from '$lib/workflow/registry';
	import DropZone from './intake/DropZone.svelte';
	import ClassifyingStage from './intake/ClassifyingStage.svelte';
	import BucketStep from './intake/BucketStep.svelte';
	import KindStep from './intake/KindStep.svelte';
	import ProjectStep from './intake/ProjectStep.svelte';
	import ReviewStep from './intake/ReviewStep.svelte';

	const workflow = $derived(
		panel.activeWorkflow ? getWorkflow(panel.activeWorkflow.workflowId) : undefined
	);
	const stepIndex = $derived(panel.activeWorkflow?.stepIndex ?? 0);
</script>

<section class="flow">
	{#if workflow}
		<!-- Title intro only while the review step has room; otherwise
		     review-cockpit takes over the whole column. -->
		{#if stepIndex < 5}
			<div class="flow-intro">
				<div class="flow-eyebrow">
					<span class="flow-eyebrow-dot"></span>
					Quest in progress
				</div>
				<h2 class="flow-title">{workflow.title}</h2>
				<p class="flow-sub">{workflow.description}</p>
			</div>
		{/if}

		{#if stepIndex === 0}
			<DropZone />
		{:else if stepIndex === 1}
			<ClassifyingStage />
		{:else if stepIndex === 2}
			<BucketStep />
		{:else if stepIndex === 3}
			<KindStep />
		{:else if stepIndex === 4}
			<ProjectStep />
		{:else if stepIndex === 5}
			<ReviewStep />
		{/if}
	{/if}
</section>

<style>
	.flow {
		display: flex;
		flex-direction: column;
		gap: 22px;
		min-height: 0;
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
</style>
