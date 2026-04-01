<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	let { data } = $props();

	const money = (value: number) =>
		new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value ?? 0);

	type MetricCardId = 'revenue' | 'expense' | 'netProfit' | 'receivablesPayables';
	type DetailRow = { date: string; source: string; ref: string; note: string; amount: number };
	let selectedCard = $state<MetricCardId | null>(null);

	const metricCards = $derived([
		{
			id: 'revenue' as const,
			label: 'Total Revenue',
			value: money(data.overview.revenue),
			tooltip:
				'Total sales recognized in the selected period from all customer invoices (including tax amount).'
		},
		{
			id: 'expense' as const,
			label: 'Total Expense',
			value: money(data.overview.expense),
			tooltip:
				'Total project-related costs in the selected period, including supplier invoices, staff costs, and operating expenses.'
		},
		{
			id: 'netProfit' as const,
			label: 'Net Profit',
			value: money(data.overview.netProfit),
			tooltip: 'Net result for the selected period: Total Revenue minus Total Expense.'
		},
		{
			id: 'receivablesPayables' as const,
			label: 'Receivables / Payables',
			value: `${money(data.overview.pendingReceivable)} / ${money(data.overview.pendingPayable)}`,
			tooltip:
				'Outstanding customer collections and supplier payments. This item is currently a placeholder in this phase.'
		}
	]);

	const trendClass = (value: number) => (value >= 0 ? 'text-emerald-700' : 'text-rose-700');

	const revenueRows = $derived.by(
		(): DetailRow[] =>
			data.overview.details.revenueItems.map((item) => ({
				date: item.date || '-',
				source: 'customer_invoice',
				ref: item.ref || item.id,
				note: item.note || '-',
				amount: item.amount
			}))
	);
	const expenseRows = $derived.by(
		(): DetailRow[] =>
			data.overview.details.expenseItems.map((item) => ({
				date: item.date || '-',
				source: item.source,
				ref: item.ref || item.id,
				note: item.note || '-',
				amount: item.amount
			}))
	);
	const netProfitRows = $derived.by(
		(): DetailRow[] =>
			[
				...revenueRows.map((row) => ({ ...row, source: `+ ${row.source}`, amount: row.amount })),
				...expenseRows.map((row) => ({ ...row, source: `- ${row.source}`, amount: -row.amount }))
			].sort((a, b) => b.date.localeCompare(a.date))
	);
	const detailModal = $derived.by(() => {
		if (!selectedCard) return null;
		if (selectedCard === 'revenue') {
			return {
				title: 'Revenue Details',
				subtitle: 'Records inside current filter range.',
				total: data.overview.revenue,
				rows: revenueRows,
				empty: 'No revenue details in selected range.'
			};
		}
		if (selectedCard === 'expense') {
			return {
				title: 'Expense Details',
				subtitle: 'Supplier + staff + expense records in current range.',
				total: data.overview.expense,
				rows: expenseRows,
				empty: 'No expense details in selected range.'
			};
		}
		if (selectedCard === 'netProfit') {
			return {
				title: 'Net Profit Composition',
				subtitle: 'Revenue(+) and expense(-) impacts by date in current range.',
				total: data.overview.netProfit,
				rows: netProfitRows,
				empty: 'No net profit composition records in selected range.'
			};
		}
		return {
			title: 'Receivables / Payables',
			subtitle: 'This phase keeps receivables and payables summary as placeholder.',
			total: data.overview.pendingReceivable - data.overview.pendingPayable,
			rows: [] as DetailRow[],
			empty: 'No receivable/payable detail records yet.'
		};
	});
</script>

<PageShell
	eyebrow="Dashboard"
	title="SmartFin Console"
	description="Operational snapshot with period-over-period trends and project profitability ranking."
>
	<form method="GET" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-end gap-3">
			<label class="text-sm text-slate-600">
				Project Status
				<select
					name="status"
					value={data.filters.status}
					class="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
				>
					<option value="">All</option>
					<option value="active">active</option>
					<option value="on_hold">on_hold</option>
					<option value="completed">completed</option>
					<option value="archived">archived</option>
				</select>
			</label>
			<label class="text-sm text-slate-600">
				From
				<input
					type="date"
					name="from"
					value={data.filters.from}
					class="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</label>
			<label class="text-sm text-slate-600">
				To
				<input
					type="date"
					name="to"
					value={data.filters.to}
					class="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
				/>
			</label>
			<button class="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700" type="submit">
				Apply
			</button>
			<p class="text-xs text-slate-500">
				Current period: {data.overview.range.start || '--'} to {data.overview.range.end || '--'}
			</p>
		</div>
	</form>

	<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each metricCards as metric}
			<div class="relative rounded-xl border border-slate-200 bg-white shadow-sm">
				<button
					type="button"
					class="w-full rounded-xl p-4 text-left transition hover:bg-slate-50"
					onclick={() => (selectedCard = metric.id)}
				>
					<p class="text-sm text-slate-500">{metric.label}</p>
					<p class="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
				</button>
				<button
					type="button"
					class="absolute right-3 top-3 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500"
					aria-label={`Show ${metric.label} calculation logic`}
					title={metric.tooltip}
				>
					i
				</button>
			</div>
		{/each}
	</section>

	<section class="grid gap-4 md:grid-cols-3">
		<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs text-slate-500">Revenue Delta vs Previous Period</p>
			<p class={`mt-2 text-xl font-semibold ${trendClass(data.overview.trend.revenueDelta)}`}>
				{money(data.overview.trend.revenueDelta)}
			</p>
		</article>
		<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs text-slate-500">Expense Delta vs Previous Period</p>
			<p class={`mt-2 text-xl font-semibold ${trendClass(-data.overview.trend.expenseDelta)}`}>
				{money(data.overview.trend.expenseDelta)}
			</p>
		</article>
		<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs text-slate-500">Net Profit Delta vs Previous Period</p>
			<p class={`mt-2 text-xl font-semibold ${trendClass(data.overview.trend.netProfitDelta)}`}>
				{money(data.overview.trend.netProfitDelta)}
			</p>
		</article>
	</section>

	<section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
			<h2 class="text-sm font-semibold text-slate-700">Project Profit Ranking</h2>
		</div>
		<table class="min-w-full divide-y divide-slate-200 text-sm">
			<thead class="bg-white text-left text-slate-600">
				<tr>
					<th class="px-4 py-3">Project</th>
					<th class="px-4 py-3">Status</th>
					<th class="px-4 py-3">Revenue</th>
					<th class="px-4 py-3">Cost</th>
					<th class="px-4 py-3">Profit</th>
					<th class="px-4 py-3">Margin</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#if data.projectRanking.length === 0}
					<tr>
						<td class="px-4 py-8 text-center text-slate-500" colspan="6">
							No project ranking data yet.
						</td>
					</tr>
				{:else}
					{#each data.projectRanking as row}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 font-medium text-slate-800">{row.projectName}</td>
							<td class="px-4 py-3">{row.projectStatus}</td>
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

{#if detailModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-slate-900/40"
			aria-label="Close detail dialog"
			onclick={() => (selectedCard = null)}
		></button>
		<div class="relative max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
			<div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h3 class="text-base font-semibold text-slate-900">{detailModal.title}</h3>
						<p class="text-xs text-slate-500">{detailModal.subtitle}</p>
					</div>
					<div class="text-right">
						<p class="text-xs text-slate-500">Current Total</p>
						<p class="text-sm font-semibold text-slate-900">{money(detailModal.total)}</p>
					</div>
				</div>
			</div>
			<div class="max-h-[60vh] overflow-auto">
				<table class="min-w-full divide-y divide-slate-200 text-sm">
					<thead class="bg-white text-left text-slate-600">
						<tr>
							<th class="px-4 py-3">Date</th>
							<th class="px-4 py-3">Source</th>
							<th class="px-4 py-3">Ref</th>
							<th class="px-4 py-3">Note</th>
							<th class="px-4 py-3 text-right">Amount</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#if detailModal.rows.length === 0}
							<tr>
								<td class="px-4 py-8 text-center text-slate-500" colspan="5">{detailModal.empty}</td>
							</tr>
						{:else}
							{#each detailModal.rows as row}
								<tr class="hover:bg-slate-50">
									<td class="px-4 py-3 text-slate-700">{row.date}</td>
									<td class="px-4 py-3 text-slate-700">{row.source}</td>
									<td class="px-4 py-3 font-medium text-slate-800">{row.ref}</td>
									<td class="px-4 py-3 text-slate-700">{row.note}</td>
									<td class="px-4 py-3 text-right text-slate-800">{money(row.amount)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}
