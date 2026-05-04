<script lang="ts">
	import { onMount } from 'svelte';
	import { Sparkles } from 'lucide-svelte';
	import { panel } from '$app-layer/ai-panel/workflow/panel.svelte';

	let isMac = $state(false);

	onMount(() => {
		isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
		const onKey = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && (e.key === 'k' || e.key === 'K')) {
				e.preventDefault();
				panel.toggle();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function onClick() {
		panel.open();
	}
</script>

<div
	class="orb-wrap"
	class:is-consumed={panel.isOpen}
	aria-hidden={panel.isOpen}
>
	<button
		type="button"
		class="orb"
		onclick={onClick}
		disabled={panel.isOpen}
		aria-label={`Open task mode (${isMac ? 'Cmd' : 'Ctrl'}+K)`}
	>
		<span class="orb-ring orb-ring-1"></span>
		<span class="orb-ring orb-ring-2"></span>
		<span class="orb-core">
			<Sparkles size={22} strokeWidth={2} />
		</span>
	</button>
	<span class="orb-hint">
		<kbd>{isMac ? 'Cmd' : 'Ctrl'}</kbd><kbd>K</kbd>
	</span>
</div>

<style>
	.orb-wrap {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 55;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		transition:
			opacity 220ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 460ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* When the panel takes over, the orb visually "becomes" the portal:
	   it briefly swells, then fades under the expanding clip-path. */
	.orb-wrap.is-consumed {
		opacity: 0;
		transform: scale(1.18);
		pointer-events: none;
	}

	.orb {
		position: relative;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		border: 1px solid rgba(234, 188, 60, 0.55);
		background:
			radial-gradient(circle at 32% 28%, #fbe38e 0%, #eabc3c 42%, #b9881a 100%);
		color: #2d1f08;
		cursor: pointer;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 10px 28px -8px rgba(0, 0, 0, 0.45),
			0 2px 8px -2px rgba(234, 188, 60, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.55),
			inset 0 -3px 8px rgba(120, 78, 6, 0.45);
		transition:
			transform 200ms cubic-bezier(0.2, 1, 0.2, 1),
			box-shadow 200ms cubic-bezier(0.2, 1, 0.2, 1);
	}

	.orb:hover {
		transform: translateY(-2px) scale(1.03);
		box-shadow:
			0 14px 34px -8px rgba(0, 0, 0, 0.55),
			0 4px 16px -2px rgba(234, 188, 60, 0.55),
			inset 0 1px 0 rgba(255, 255, 255, 0.65),
			inset 0 -3px 10px rgba(120, 78, 6, 0.5);
	}
	.orb:active {
		transform: translateY(0) scale(0.97);
	}
	.orb:disabled {
		cursor: default;
	}

	.orb-core {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.35));
	}

	/* Pulsing halo rings â€?two layered, staggered */
	.orb-ring {
		position: absolute;
		inset: -2px;
		border-radius: 50%;
		border: 1px solid rgba(234, 188, 60, 0.45);
		pointer-events: none;
		opacity: 0;
	}
	.orb-ring-1 {
		animation: orb-pulse 3.2s cubic-bezier(0.2, 0.6, 0.2, 1) infinite;
	}
	.orb-ring-2 {
		animation: orb-pulse 3.2s cubic-bezier(0.2, 0.6, 0.2, 1) infinite;
		animation-delay: 1.6s;
	}
	@keyframes orb-pulse {
		0% {
			transform: scale(1);
			opacity: 0.55;
			border-color: rgba(234, 188, 60, 0.45);
		}
		80% {
			opacity: 0.04;
			border-color: rgba(234, 188, 60, 0.02);
		}
		100% {
			transform: scale(1.85);
			opacity: 0;
			border-color: rgba(234, 188, 60, 0);
		}
	}

	.orb-hint {
		display: inline-flex;
		gap: 2px;
		font-family: 'Inter', sans-serif;
		font-size: 10.5px;
		color: rgba(234, 188, 60, 0.85);
		letter-spacing: 0.02em;
		user-select: none;
		opacity: 0.75;
	}
	.orb-hint kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		font-family: inherit;
		font-size: 10px;
		font-weight: 500;
		color: rgba(234, 188, 60, 0.95);
		background: rgba(13, 26, 11, 0.85);
		border: 1px solid rgba(234, 188, 60, 0.25);
		border-radius: 4px;
		backdrop-filter: blur(4px);
	}
</style>
