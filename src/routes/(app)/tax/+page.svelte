<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	let { data } = $props();

	const money = (value: number) =>
		new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value ?? 0);

	const boxRows = [
		{ code: 1, key: 'box1', label: 'Standard-rated supplies' },
		{ code: 2, key: 'box2', label: 'Zero-rated supplies' },
		{ code: 3, key: 'box3', label: 'Exempt supplies' },
		{ code: 4, key: 'box4', label: 'Total supplies' },
		{ code: 5, key: 'box5', label: 'Taxable purchases' },
		{ code: 6, key: 'box6', label: 'Output tax due' },
		{ code: 7, key: 'box7', label: 'Input tax and refunds' },
		{ code: 8, key: 'box8', label: 'GST payable / claimable' }
	] as const;
</script>

<PageShell
	eyebrow="Tax"
	title="Tax Management"
	description="Quarterly GST box summary with drill-down to invoice-level details."
>
	<form method="GET" class="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
		<label class="text-sm text-slate-600">
			Year
			<input
				type="number"
				name="year"
				value={data.year}
				class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
			/>
		</label>
		<label class="text-sm text-slate-600">
			Quarter
			<select
				name="quarter"
				value={`${data.quarter}`}
				class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
			>
				<option value="1">Q1</option>
				<option value="2">Q2</option>
				<option value="3">Q3</option>
				<option value="4">Q4</option>
			</select>
		</label>
		<div class="flex items-end">
			<button class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">
				Load Period
			</button>
		</div>
		<p class="flex items-end text-sm text-slate-500">
			Range: {data.gst.range.start || '--'} to {data.gst.range.end || '--'}
		</p>
	</form>

	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<table class="min-w-full divide-y divide-slate-200 text-sm">
			<thead class="bg-slate-50 text-left text-slate-600">
				<tr>
					<th class="px-4 py-3">Box</th>
					<th class="px-4 py-3">Description</th>
					<th class="px-4 py-3">Amount</th>
					<th class="px-4 py-3">Details</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each boxRows as box}
					<tr class="hover:bg-slate-50">
						<td class="px-4 py-3 font-semibold text-slate-700">Box {box.code}</td>
						<td class="px-4 py-3">{box.label}</td>
						<td class="px-4 py-3">{money(data.gst.boxes[box.key])}</td>
						<td class="px-4 py-3">
							<a
								class="text-indigo-600 hover:text-indigo-500"
								href={`/tax/gst/${data.year}/${data.quarter}/box/${box.code}`}
							>
								View
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</PageShell>
