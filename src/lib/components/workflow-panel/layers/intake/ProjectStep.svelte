<script lang="ts">
	import { Check, Search, X, Sparkles, Building2 } from 'lucide-svelte';
	import { panel } from '$lib/workflow/panel.svelte';

	type ProjectMatch = {
		id: string;
		name: string;
		customerName: string | null;
		score: number;
	};
	type ClassifyResult = {
		projectMatches: ProjectMatch[];
	};

	const wfState = $derived((panel.activeWorkflow?.state as Record<string, unknown>) ?? {});
	const classifyResult = $derived(wfState.classifyResult as ClassifyResult | undefined);

	const aiPickId = $derived<string | null>(classifyResult?.projectMatches[0]?.id ?? null);

	// null = explicitly "No project / company overhead"
	// undefined = nothing selected yet
	let selection = $state<string | null | undefined>(undefined);
	let searchOpen = $state(false);
	let searchQ = $state('');
	let searchResults = $state<ProjectMatch[]>([]);
	let searching = $state(false);

	$effect(() => {
		if (classifyResult && selection === undefined) {
			// Default to AI's top match; if no matches, leave undefined so
			// user sees unopinionated state.
			selection = aiPickId ?? null;
		}
	});

	function pick(id: string | null) {
		selection = id;
	}

	async function runSearch() {
		searching = true;
		try {
			const params = new URLSearchParams();
			if (searchQ) params.set('q', searchQ);
			const res = await fetch(`/api/projects?${params.toString()}`);
			const json = (await res.json()) as {
				ok?: boolean;
				data?: Array<{
					project: { id: string; name: string };
					customerName: string | null;
				}>;
			};
			if (json.ok && json.data) {
				searchResults = json.data.map((r) => ({
					id: r.project.id,
					name: r.project.name,
					customerName: r.customerName,
					score: 0
				}));
			}
		} finally {
			searching = false;
		}
	}

	function openSearch() {
		searchOpen = true;
		if (searchResults.length === 0) void runSearch();
	}

	function pickFromSearch(p: ProjectMatch) {
		// If not already in classify matches, stash it so ReviewStep can show the name
		const existing = classifyResult?.projectMatches.find((m) => m.id === p.id);
		if (!existing) {
			panel.patchState({ extraProjectMatch: p });
		}
		selection = p.id;
		searchOpen = false;
	}

	function advance(projectId: string | null) {
		panel.patchState({ selectedProjectId: projectId });
		panel.advanceStep();
	}

	function onNext() {
		advance(selection === undefined ? null : selection);
	}

	function onSkip() {
		advance(aiPickId ?? null);
	}

	function onBack() {
		panel.setStep(3);
	}

	const matches = $derived(classifyResult?.projectMatches ?? []);
	const extraMatch = $derived(wfState.extraProjectMatch as ProjectMatch | undefined);

	const allChoices = $derived.by(() => {
		const list = matches.slice(0, 3);
		if (extraMatch && !list.find((m) => m.id === extraMatch.id)) {
			list.unshift(extraMatch);
		}
		return list;
	});
</script>

<div class="step">
	<h3 class="step-title">Which project?</h3>
	<p class="step-sub">
		{#if matches.length > 0}
			Best matches from the document text, or file it as company overhead.
		{:else}
			Nothing jumped out — you can search, or file as company overhead.
		{/if}
	</p>

	<div class="chip-flow">
		{#each allChoices as p (p.id)}
			<button
				type="button"
				class="project-chip"
				class:is-selected={selection === p.id}
				class:is-ai-pick={aiPickId === p.id}
				onclick={() => pick(p.id)}
			>
				<span class="chip-check">
					{#if selection === p.id}
						<Check size={12} strokeWidth={2.5} />
					{:else}
						<Building2 size={12} strokeWidth={1.8} />
					{/if}
				</span>
				<span class="chip-body">
					<span class="chip-name">{p.name}</span>
					{#if p.customerName}
						<span class="chip-sub">{p.customerName}</span>
					{/if}
				</span>
				{#if aiPickId === p.id}
					<span class="chip-ai-badge" title="AI's top match">
						<Sparkles size={10} strokeWidth={2.2} />
					</span>
				{/if}
			</button>
		{/each}

		<button
			type="button"
			class="project-chip is-ghost"
			class:is-selected={selection === null}
			onclick={() => pick(null)}
		>
			<span class="chip-check">
				{#if selection === null}
					<Check size={12} strokeWidth={2.5} />
				{:else}
					<Building2 size={12} strokeWidth={1.8} />
				{/if}
			</span>
			<span class="chip-body">
				<span class="chip-name">No project</span>
				<span class="chip-sub">Company overhead</span>
			</span>
		</button>

		<button type="button" class="chip-search-toggle" onclick={openSearch}>
			<Search size={13} strokeWidth={2} />
			<span>{searchOpen ? 'Searching…' : 'Other…'}</span>
		</button>
	</div>

	{#if searchOpen}
		<div class="search-box">
			<div class="search-input-row">
				<Search size={13} strokeWidth={2} />
				<input
					type="text"
					bind:value={searchQ}
					onkeydown={(e) => {
						if (e.key === 'Enter') runSearch();
					}}
					placeholder="Search project name…"
					autocomplete="off"
				/>
				<button type="button" class="search-close" onclick={() => (searchOpen = false)}>
					<X size={13} strokeWidth={2} />
				</button>
			</div>
			<div class="search-results">
				{#if searching}
					<div class="search-placeholder">Searching…</div>
				{:else if searchResults.length === 0}
					<div class="search-placeholder">No matches.</div>
				{:else}
					{#each searchResults as p (p.id)}
						<button type="button" class="search-result" onclick={() => pickFromSearch(p)}>
							<span class="sr-name">{p.name}</span>
							{#if p.customerName}<span class="sr-sub">· {p.customerName}</span>{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<div class="actions">
		<button type="button" class="btn-ghost" onclick={onBack}>← Back</button>
		<div class="actions-right">
			<button type="button" class="btn-ghost" onclick={onSkip}>Let AI decide →</button>
			<button type="button" class="btn-primary" onclick={onNext}>Next →</button>
		</div>
	</div>
</div>

<style>
	.step {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.step-title {
		font-size: clamp(20px, 2.3vw, 24px);
		font-weight: 500;
		color: var(--panel-fg);
		margin: 0;
		letter-spacing: -0.005em;
	}
	.step-sub {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--panel-fg-muted);
		max-width: 52ch;
	}

	.chip-flow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.project-chip {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 9px 14px 9px 11px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 999px;
		color: var(--panel-fg);
		font-family: inherit;
		font-size: 12.5px;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.project-chip:hover {
		border-color: var(--panel-border-strong);
		background: var(--panel-surface-raised);
	}
	.project-chip.is-ai-pick {
		border-color: rgba(234, 188, 60, 0.4);
	}
	.project-chip.is-selected {
		border-color: var(--panel-gold);
		background: rgba(234, 188, 60, 0.12);
		box-shadow: 0 0 14px -4px var(--panel-gold-glow);
	}
	.project-chip.is-ghost {
		color: var(--panel-fg-muted);
	}
	.project-chip.is-ghost.is-selected {
		color: var(--panel-fg);
	}
	.chip-check {
		display: inline-flex;
		width: 18px;
		height: 18px;
		align-items: center;
		justify-content: center;
		color: var(--panel-gold-bright);
	}
	.chip-body {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1px;
	}
	.chip-name {
		font-weight: 500;
	}
	.chip-sub {
		font-size: 10.5px;
		color: var(--panel-fg-muted);
	}
	.chip-ai-badge {
		display: inline-flex;
		width: 15px;
		height: 15px;
		align-items: center;
		justify-content: center;
		background: var(--panel-gold);
		border-radius: 999px;
		color: #2d1f08;
	}

	.chip-search-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 9px 14px;
		background: transparent;
		border: 1px dashed var(--panel-border-strong);
		border-radius: 999px;
		color: var(--panel-fg-muted);
		font-family: inherit;
		font-size: 12px;
		cursor: pointer;
		transition: all var(--panel-dur-fast) var(--panel-ease);
	}
	.chip-search-toggle:hover {
		color: var(--panel-gold-bright);
		border-color: var(--panel-gold);
	}

	.search-box {
		padding: 12px;
		background: var(--panel-surface-deep);
		border: 1px solid var(--panel-border);
		border-radius: 12px;
	}
	.search-input-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--panel-surface);
		border: 1px solid var(--panel-border);
		border-radius: 10px;
		color: var(--panel-gold);
	}
	.search-input-row input {
		flex: 1;
		background: transparent;
		border: 0;
		outline: none;
		color: var(--panel-fg);
		font-family: inherit;
		font-size: 13px;
	}
	.search-input-row input::placeholder {
		color: var(--panel-fg-faint);
	}
	.search-close {
		display: inline-flex;
		width: 20px;
		height: 20px;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 0;
		color: var(--panel-fg-faint);
		cursor: pointer;
	}
	.search-close:hover {
		color: var(--panel-gold-bright);
	}
	.search-results {
		margin-top: 8px;
		max-height: 180px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.search-result {
		display: flex;
		gap: 6px;
		padding: 8px 10px;
		background: transparent;
		border: 0;
		border-radius: 8px;
		color: var(--panel-fg);
		font-family: inherit;
		font-size: 12.5px;
		text-align: left;
		cursor: pointer;
		transition: background var(--panel-dur-fast) var(--panel-ease);
	}
	.search-result:hover {
		background: rgba(234, 188, 60, 0.06);
	}
	.sr-name {
		font-weight: 500;
	}
	.sr-sub {
		color: var(--panel-fg-muted);
	}
	.search-placeholder {
		padding: 12px;
		text-align: center;
		font-size: 12px;
		color: var(--panel-fg-muted);
	}

	.actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-top: 6px;
	}
	.actions-right {
		display: inline-flex;
		gap: 10px;
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
