<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	let { data } = $props();

	const money = (value: number) =>
		new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value ?? 0);

	const metricCards = $derived([
		{ label: 'Total Revenue', value: money(data.overview.revenue) },
		{ label: 'Total Expense', value: money(data.overview.expense) },
		{ label: 'Net Profit', value: money(data.overview.netProfit) },
		{
			label: 'Receivables / Payables',
			value: `${money(data.overview.pendingReceivable)} / ${money(data.overview.pendingPayable)}`
		}
	]);
</script>

<PageShell
	eyebrow="Dashboard"
	title="SmartFin Console"
	description="This phase focuses on the application shell and project management. Other modules remain structured placeholders."
>
	<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each metricCards as metric}
			<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-slate-500">{metric.label}</p>
				<p class="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
			</article>
		{/each}
	</section>

	<section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
			<h2 class="text-sm font-semibold text-slate-700">Project Profit Ranking</h2>
		</div>
		<table class="min-w-full divide-y divide-slate-200 text-sm">
			<thead class="bg-white text-left text-slate-600">
				<tr>
					<th class="px-4 py-3">Project</th>
					<th class="px-4 py-3">Revenue</th>
					<th class="px-4 py-3">Cost</th>
					<th class="px-4 py-3">Profit</th>
					<th class="px-4 py-3">Margin</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#if data.projectRanking.length === 0}
					<tr>
						<td class="px-4 py-8 text-center text-slate-500" colspan="5">
							No project ranking data yet.
						</td>
					</tr>
				{:else}
					{#each data.projectRanking as row}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 font-medium text-slate-800">{row.projectName}</td>
							<td class="px-4 py-3">{money(row.revenue)}</td>
							<td class="px-4 py-3">{money(row.cost)}</td>
							<td class="px-4 py-3">{money(row.profit)}</td>
							<td class="px-4 py-3">{(row.profitMargin * 100).toFixed(2)}%</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</section>
</PageShell>
