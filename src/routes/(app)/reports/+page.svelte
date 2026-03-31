<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	let { data } = $props();

	const money = (value: number) =>
		new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value ?? 0);
</script>

<PageShell
	eyebrow="Reports"
	title="Reporting Center"
	description="Project-level profitability report generated from current project financial data."
>
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<table class="min-w-full divide-y divide-slate-200 text-sm">
			<thead class="bg-slate-50 text-left text-slate-600">
				<tr>
					<th class="px-4 py-3">Project</th>
					<th class="px-4 py-3">Revenue</th>
					<th class="px-4 py-3">Cost</th>
					<th class="px-4 py-3">Profit</th>
					<th class="px-4 py-3">Margin</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#if data.projectsProfit.length === 0}
					<tr>
						<td class="px-4 py-8 text-center text-slate-500" colspan="5">No report data yet.</td>
					</tr>
				{:else}
					{#each data.projectsProfit as item}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 font-medium text-slate-800">{item.projectName}</td>
							<td class="px-4 py-3">{money(item.revenue)}</td>
							<td class="px-4 py-3">{money(item.cost)}</td>
							<td class="px-4 py-3">{money(item.profit)}</td>
							<td class="px-4 py-3">{(item.profitMargin * 100).toFixed(2)}%</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</PageShell>
