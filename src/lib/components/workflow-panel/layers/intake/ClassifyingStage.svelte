<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { AlertTriangle } from 'lucide-svelte';
	import { panel } from '$lib/workflow/panel.svelte';

	// Phase labels cycle while the classify call runs; not real sub-steps, just
	// a narrative to make the ~2-5 second wait feel intentional. Vision doc §5.3
	// "1px progress bar / breathing effect" — we use both: bar + rotating phrase.
	const PHASES = [
		'Reading the text…',
		'Figuring out what it is…',
		'Extracting fields…',
		'Looking for matching projects…'
	];

	let phaseIndex = $state(0);
	let error = $state('');
	let phaseTimer: ReturnType<typeof setInterval> | null = null;
	let started = false;

	type ClassifyResponse = {
		bucket: 'revenue' | 'expense' | 'document_only';
		docType: string;
		expenseType: 'opex' | 'sales_cost' | null;
		category: string | null;
		categoryDocType: 'invoice' | 'receipt' | 'po' | null;
		fields: Record<string, unknown>;
		projectMatches: Array<{ id: string; name: string; customerName: string | null; score: number }>;
		confidence: number;
		narration: string;
		provider: { classifier: string };
	};

	async function runClassify() {
		const state = (panel.activeWorkflow?.state ?? {}) as Record<string, unknown>;
		const rawText = (state.rawText as string | undefined) ?? '';
		const hintDocType = state.hintDocType as string | undefined;
		const fileName = state.fileName as string | undefined;

		if (!rawText || rawText.length < 20) {
			error =
				"I couldn't extract readable text from that file. Try a PDF with text layer, or a clearer photo.";
			return;
		}

		try {
			const res = await fetch('/api/intake/classify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ rawText, fileName, hintDocType })
			});
			const json = (await res.json()) as { ok?: boolean; data?: ClassifyResponse; error?: string };
			if (!res.ok || !json.ok || !json.data) {
				throw new Error(json.error ?? `Classify failed (${res.status})`);
			}
			const result = json.data;

			panel.patchState({ classifyResult: result });

			// Auto-skip step 3 when we're confident: show narration briefly on
			// step 3's mount and move on. We don't skip here because step 3's
			// UX handles the 1-second reveal; just advance to it.
			panel.advanceStep();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Classification failed';
		}
	}

	onMount(() => {
		if (started) return;
		started = true;

		// Kick off the phase animation + the classify call on mount.
		phaseTimer = setInterval(() => {
			phaseIndex = (phaseIndex + 1) % PHASES.length;
		}, 1100);

		untrack(() => {
			void runClassify().finally(() => {
				if (phaseTimer) clearInterval(phaseTimer);
				phaseTimer = null;
			});
		});

		return () => {
			if (phaseTimer) clearInterval(phaseTimer);
		};
	});

	function onRetry() {
		error = '';
		phaseIndex = 0;
		started = false;
		phaseTimer = setInterval(() => {
			phaseIndex = (phaseIndex + 1) % PHASES.length;
		}, 1100);
		void runClassify().finally(() => {
			if (phaseTimer) clearInterval(phaseTimer);
			phaseTimer = null;
		});
	}

	function onBack() {
		panel.setStep(0);
	}
</script>

<div class="classify">
	{#if error}
		<div class="classify-error">
			<span class="err-icon">
				<AlertTriangle size={24} strokeWidth={1.8} />
			</span>
			<div class="err-title">I hit a snag</div>
			<p class="err-sub">{error}</p>
			<div class="err-actions">
				<button type="button" class="btn-secondary" onclick={onBack}>Pick another file</button>
				<button type="button" class="btn-primary" onclick={onRetry}>Try again</button>
			</div>
		</div>
	{:else}
		<div class="reading-card">
			<div class="ripple" aria-hidden="true">
				<span class="ripple-dot"></span>
				<span class="ripple-dot"></span>
				<span class="ripple-dot"></span>
			</div>
			<div class="reading-title">I'm reading it.</div>
			<div class="reading-phase" aria-live="polite">
				{PHASES[phaseIndex]}
			</div>
			<div class="progress-track" aria-hidden="true">
				<span class="progress-glow"></span>
			</div>
			<div class="reading-footnote">This usually takes a couple of seconds.</div>
		</div>
	{/if}
</div>

<style>
	.classify {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.reading-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 56px 28px 48px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 20px;
		overflow: hidden;
	}

	.ripple {
		display: inline-flex;
		gap: 10px;
		margin-bottom: 6px;
	}
	.ripple-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--panel-gold);
		box-shadow: 0 0 14px -2px var(--panel-gold-glow);
		animation: breathe 1.4s ease-in-out infinite;
	}
	.ripple-dot:nth-child(2) {
		animation-delay: 0.18s;
	}
	.ripple-dot:nth-child(3) {
		animation-delay: 0.36s;
	}
	@keyframes breathe {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.reading-title {
		font-size: clamp(20px, 2.3vw, 24px);
		font-weight: 500;
		color: var(--panel-fg);
		letter-spacing: -0.005em;
	}
	.reading-phase {
		font-size: 13.5px;
		color: var(--panel-fg-muted);
		min-height: 1.4em;
		transition: opacity var(--panel-dur-base) var(--panel-ease);
	}

	.progress-track {
		position: relative;
		width: min(60%, 260px);
		height: 1px;
		background: var(--panel-divider);
		overflow: hidden;
		margin-top: 10px;
	}
	.progress-glow {
		position: absolute;
		top: 0;
		bottom: 0;
		left: -30%;
		width: 30%;
		background: linear-gradient(
			to right,
			transparent,
			var(--panel-gold) 50%,
			transparent
		);
		animation: progress-sweep 1.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
	}
	@keyframes progress-sweep {
		0% {
			left: -30%;
		}
		100% {
			left: 100%;
		}
	}

	.reading-footnote {
		margin-top: 8px;
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--panel-fg-faint);
	}

	/* Error state */
	.classify-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 40px 28px 32px;
		text-align: center;
		background: rgba(225, 118, 118, 0.04);
		border: 1px solid rgba(225, 118, 118, 0.3);
		border-radius: 18px;
	}
	.err-icon {
		display: inline-flex;
		width: 48px;
		height: 48px;
		align-items: center;
		justify-content: center;
		border-radius: 14px;
		background: rgba(225, 118, 118, 0.12);
		color: var(--panel-danger);
	}
	.err-title {
		font-size: 17px;
		font-weight: 500;
		color: var(--panel-fg);
	}
	.err-sub {
		font-size: 13px;
		line-height: 1.55;
		color: var(--panel-fg-muted);
		max-width: 44ch;
		margin: 0;
	}
	.err-actions {
		display: inline-flex;
		gap: 10px;
		margin-top: 12px;
	}
	.btn-secondary,
	.btn-primary {
		padding: 8px 16px;
		border-radius: 10px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.btn-secondary {
		background: transparent;
		border: 1px solid var(--panel-border-strong);
		color: var(--panel-fg-muted);
	}
	.btn-secondary:hover {
		color: var(--panel-fg);
		border-color: var(--panel-gold);
	}
	.btn-primary {
		background: var(--panel-gold);
		border: 1px solid var(--panel-gold-bright);
		color: #2d1f08;
		box-shadow: 0 0 14px -3px var(--panel-gold-glow);
	}
	.btn-primary:hover {
		background: var(--panel-gold-bright);
	}
</style>
