<script lang="ts">
	import { ArrowDownLeft, ArrowUpRight, FolderArchive, Sparkles } from 'lucide-svelte';
	import { panel } from '$lib/workflow/panel.svelte';
	import { BUCKET_OPTIONS, type Bucket } from './field-specs';

	type ClassifyResult = {
		bucket: Bucket;
		docType: string;
		narration: string;
	};

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});
	const classifyResult = $derived(wfState.classifyResult as ClassifyResult | undefined);

	// AI's pick is the pre-highlighted chip. User can click a different chip
	// to override; either way, the selection propagates forward.
	let selection = $state<Bucket | null>(null);

	$effect(() => {
		if (classifyResult && selection === null) {
			selection = classifyResult.bucket;
		}
	});

	function pick(b: Bucket) {
		selection = b;
	}

	function advance(bucket: Bucket) {
		panel.patchState({ selectedBucket: bucket });
		panel.advanceStep();
	}

	function onNext() {
		advance(selection ?? classifyResult?.bucket ?? 'expense');
	}

	function onSkip() {
		// "Let AI decide" — use the classifier's pick directly.
		advance(classifyResult?.bucket ?? 'expense');
	}

	function iconFor(b: Bucket) {
		if (b === 'revenue') return ArrowDownLeft;
		if (b === 'expense') return ArrowUpRight;
		return FolderArchive;
	}
</script>

{#if classifyResult}
	<div class="step">
		<div class="step-narration">
			<span class="narration-dot"></span>
			<span class="narration-eyebrow">I think</span>
			<span class="narration-text">{classifyResult.narration}</span>
		</div>

		<h3 class="step-title">Where does this go?</h3>
		<p class="step-sub">Pick the right bucket, or let me decide.</p>

		<div class="chip-row">
			{#each BUCKET_OPTIONS as opt (opt.id)}
				{@const Icon = iconFor(opt.id)}
				<button
					type="button"
					class="chip"
					class:is-selected={selection === opt.id}
					class:is-ai-pick={classifyResult.bucket === opt.id}
					onclick={() => pick(opt.id)}
				>
					<span class="chip-icon"><Icon size={16} strokeWidth={2} /></span>
					<span class="chip-body">
						<span class="chip-label">{opt.label}</span>
						<span class="chip-sub">{opt.sublabel}</span>
					</span>
					{#if classifyResult.bucket === opt.id}
						<span class="chip-ai-badge" title="AI's pick">
							<Sparkles size={10} strokeWidth={2} />
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="actions">
			<button type="button" class="btn-ghost" onclick={onSkip}>Let AI decide →</button>
			<button type="button" class="btn-primary" onclick={onNext}>Next →</button>
		</div>
	</div>
{/if}

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.step-narration {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 18px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 14px;
		font-size: 13.5px;
		color: var(--panel-fg);
	}
	.narration-eyebrow {
		flex-shrink: 0;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--panel-gold);
	}
	.narration-text {
		flex: 1;
		color: var(--panel-fg-muted);
		line-height: 1.45;
	}
	.narration-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--panel-gold);
		box-shadow: 0 0 8px var(--panel-gold-glow);
		flex-shrink: 0;
	}

	.step-title {
		font-size: clamp(20px, 2.3vw, 24px);
		font-weight: 500;
		color: var(--panel-fg);
		margin: 6px 0 0 0;
		letter-spacing: -0.005em;
	}
	.step-sub {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--panel-fg-muted);
		max-width: 52ch;
	}

	.chip-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin-top: 6px;
	}

	.chip {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 14px;
		color: var(--panel-fg);
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.chip:hover {
		border-color: var(--panel-border-strong);
		background: var(--panel-surface-raised);
	}
	.chip.is-ai-pick {
		border-color: rgba(234, 188, 60, 0.45);
	}
	.chip.is-selected {
		border-color: var(--panel-gold);
		background: rgba(234, 188, 60, 0.1);
		box-shadow: 0 0 18px -4px var(--panel-gold-glow);
	}
	.chip-icon {
		display: inline-flex;
		width: 34px;
		height: 34px;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: rgba(234, 188, 60, 0.06);
		border: 1px solid rgba(234, 188, 60, 0.2);
		color: var(--panel-gold-bright);
		flex-shrink: 0;
	}
	.chip.is-selected .chip-icon {
		background: var(--panel-gold-soft);
		border-color: var(--panel-gold);
	}
	.chip-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.chip-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--panel-fg);
	}
	.chip-sub {
		font-size: 11.5px;
		color: var(--panel-fg-muted);
	}
	.chip-ai-badge {
		position: absolute;
		top: 8px;
		right: 8px;
		display: inline-flex;
		width: 18px;
		height: 18px;
		align-items: center;
		justify-content: center;
		background: var(--panel-gold);
		border-radius: 999px;
		color: #2d1f08;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 12px;
		margin-top: 6px;
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
