<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Maximize2, Minimize2 } from 'lucide-svelte';
	import { panel } from '$lib/workflow/panel.svelte';
	import TodayBrief from './layers/TodayBrief.svelte';
	import ActiveFlow from './layers/ActiveFlow.svelte';
	import QuickActions from './layers/QuickActions.svelte';

	let scrimEl: HTMLDivElement | null = $state(null);

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && panel.isOpen) {
				e.preventDefault();
				panel.close();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function onScrimClick(e: MouseEvent) {
		if (e.target === scrimEl) panel.close();
	}
</script>

{#if panel.isVisible}
	<div
		bind:this={scrimEl}
		class="sf-panel-scrim"
		class:is-open={panel.openState === 'open' || panel.openState === 'opening'}
		class:is-half={panel.mode === 'half'}
		class:is-full={panel.mode === 'full'}
		onclick={onScrimClick}
		role="presentation"
	>
		<aside
			class="sf-panel sf-panel-shell"
			class:is-open={panel.openState === 'open' || panel.openState === 'opening'}
			class:is-half={panel.mode === 'half'}
			class:is-full={panel.mode === 'full'}
			aria-label="AI task panel"
		>
			<!-- Left edge: animated wave ribbon. Pointer-events none so it
			     doesn't interfere with interactions. -->
			<svg
				class="wave-edge"
				aria-hidden="true"
				preserveAspectRatio="none"
				viewBox="0 0 40 800"
			>
				<defs>
					<linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stop-color="var(--panel-gold)" stop-opacity="0.0" />
						<stop offset="35%" stop-color="var(--panel-gold)" stop-opacity="0.55" />
						<stop offset="65%" stop-color="var(--panel-green-bright)" stop-opacity="0.55" />
						<stop offset="100%" stop-color="var(--panel-gold)" stop-opacity="0.0" />
					</linearGradient>
					<filter id="waveBlur" x="-50%" y="-10%" width="200%" height="120%">
						<feGaussianBlur stdDeviation="1.4" />
					</filter>
				</defs>
				<g filter="url(#waveBlur)">
					<path
						class="wave wave-a"
						d="M 6,-50 Q 22,30 6,110 T 6,270 T 6,430 T 6,590 T 6,750 T 6,910 L 0,910 L 0,-50 Z"
						fill="url(#waveGradient)"
					/>
					<path
						class="wave wave-b"
						d="M 14,-50 Q 28,50 14,150 T 14,350 T 14,550 T 14,750 T 14,950 L 0,950 L 0,-50 Z"
						fill="url(#waveGradient)"
						opacity="0.5"
					/>
				</g>
			</svg>

			<header class="sf-panel-header">
				<div class="sf-panel-header-left">
					<span class="sf-panel-badge">
						<span class="sf-panel-badge-dot"></span>
						Task mode
					</span>
				</div>
				<div class="sf-panel-header-right">
					<button
						type="button"
						class="sf-panel-iconbtn"
						title={panel.mode === 'half' ? 'Expand' : 'Compact'}
						onclick={() => panel.toggleMode()}
					>
						{#if panel.mode === 'half'}
							<Maximize2 size={14} strokeWidth={1.75} />
						{:else}
							<Minimize2 size={14} strokeWidth={1.75} />
						{/if}
					</button>
					<button
						type="button"
						class="sf-panel-iconbtn"
						title="Close (Esc)"
						onclick={() => panel.close()}
					>
						<X size={14} strokeWidth={1.75} />
					</button>
				</div>
			</header>

			<div class="sf-panel-body">
				{#if panel.activeWorkflow}
					<ActiveFlow />
				{:else}
					<TodayBrief />
				{/if}
			</div>

			<footer class="sf-panel-footer">
				<QuickActions />
			</footer>
		</aside>
	</div>
{/if}

<style>
	/* Scrim: dims main app while panel is open. */
	.sf-panel-scrim {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: transparent;
		pointer-events: none;
		transition: background-color var(--panel-dur-portal) var(--panel-ease);
	}
	.sf-panel-scrim.is-open {
		pointer-events: auto;
	}
	.sf-panel-scrim.is-open.is-half {
		background-color: rgba(6, 12, 5, 0.32);
	}
	.sf-panel-scrim.is-open.is-full {
		background-color: rgba(6, 12, 5, 0.66);
	}

	/* Panel shell — opens as a portal from the bottom-right orb.
	 * clip-path circle() is set relative to the orb's position. */
	.sf-panel-shell {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		background: var(--panel-bg);
		background:
			radial-gradient(circle at 100% 0%, rgba(234, 188, 60, 0.14) 0%, transparent 48%),
			radial-gradient(circle at 0% 100%, rgba(95, 181, 94, 0.11) 0%, transparent 54%),
			var(--panel-bg);
		color: var(--panel-fg);
		border-left: 1px solid var(--panel-border);
		box-shadow:
			-30px 0 70px -22px rgba(0, 0, 0, 0.6),
			inset 1px 0 0 rgba(234, 188, 60, 0.06);
		transition:
			clip-path var(--panel-dur-portal) var(--panel-ease),
			width var(--panel-dur-base) var(--panel-ease);
		will-change: clip-path, width;
		/* Closed state: circle clipped down to the orb's position. */
		clip-path: circle(0% at calc(100% - 54px) calc(100% - 54px));
	}
	.sf-panel-shell.is-open {
		clip-path: circle(150vmax at calc(100% - 54px) calc(100% - 54px));
	}
	.sf-panel-shell.is-half {
		width: min(58vw, 720px);
	}
	.sf-panel-shell.is-full {
		width: min(92vw, 1280px);
	}
	@media (max-width: 900px) {
		.sf-panel-shell.is-half,
		.sf-panel-shell.is-full {
			width: 100vw;
		}
	}

	/* Wave edge ribbon on the panel's left boundary */
	.wave-edge {
		position: absolute;
		top: 0;
		bottom: 0;
		left: -2px;
		width: 34px;
		height: 100%;
		pointer-events: none;
		z-index: 2;
		opacity: 0.95;
	}
	.wave {
		transform-origin: center;
		animation: wave-rise 9s cubic-bezier(0.45, 0, 0.55, 1) infinite;
	}
	.wave-b {
		animation-duration: 13s;
		animation-direction: reverse;
	}
	@keyframes wave-rise {
		0% {
			transform: translateY(0);
		}
		100% {
			transform: translateY(-160px);
		}
	}

	.sf-panel-header {
		position: relative;
		z-index: 3;
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 22px 14px 34px;
		border-bottom: 1px solid var(--panel-divider);
	}
	.sf-panel-header-left,
	.sf-panel-header-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.sf-panel-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 11px;
		border: 1px solid var(--panel-border-strong);
		border-radius: 999px;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--panel-gold);
		background: rgba(234, 188, 60, 0.05);
	}
	.sf-panel-badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--panel-gold);
		box-shadow: 0 0 10px var(--panel-gold-glow), 0 0 0 3px var(--panel-gold-soft);
	}
	.sf-panel-iconbtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--panel-fg-muted);
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.sf-panel-iconbtn:hover {
		background: rgba(234, 188, 60, 0.08);
		color: var(--panel-gold-bright);
		border-color: var(--panel-border);
	}

	.sf-panel-body {
		position: relative;
		z-index: 3;
		flex: 1 1 auto;
		overflow-y: auto;
		padding: 28px 28px 20px 34px;
	}

	.sf-panel-footer {
		position: relative;
		z-index: 3;
		flex: 0 0 auto;
		border-top: 1px solid var(--panel-divider);
		padding: 14px 22px 16px 34px;
		background: var(--panel-surface-deep);
	}
</style>
