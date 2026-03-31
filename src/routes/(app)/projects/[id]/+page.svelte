<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';

	let { data, form } = $props();

	const money = (value: number) =>
		new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value ?? 0);
</script>

<PageShell
	eyebrow="Project Detail"
	title={data.project.name}
	description={`Customer: ${data.customerName} | Status: ${data.project.status}`}
>
	<section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs text-slate-500">Revenue</p>
			<p class="mt-2 text-xl font-semibold text-slate-900">{money(data.breakdown.revenue)}</p>
		</article>
		<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs text-slate-500">Purchase Cost</p>
			<p class="mt-2 text-xl font-semibold text-slate-900">{money(data.breakdown.purchaseCost)}</p>
		</article>
		<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs text-slate-500">Staff Cost</p>
			<p class="mt-2 text-xl font-semibold text-slate-900">{money(data.breakdown.staffCost)}</p>
		</article>
		<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-xs text-slate-500">Expense Cost</p>
			<p class="mt-2 text-xl font-semibold text-slate-900">{money(data.breakdown.expenseCost)}</p>
		</article>
	</section>

	<section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
		<p class="text-sm text-slate-500">Project Profit</p>
		<p class="mt-2 text-2xl font-semibold {data.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
			{money(data.profit)}
		</p>
	</section>

	<section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
		<a class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50" href={`/projects/${data.project.id}/contracts`}>
			<p class="text-xs text-slate-500">Project Submodule</p>
			<p class="mt-1 font-medium text-slate-800">Contracts</p>
		</a>
		<a class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50" href={`/projects/${data.project.id}/quotations`}>
			<p class="text-xs text-slate-500">Project Submodule</p>
			<p class="mt-1 font-medium text-slate-800">Quotations</p>
		</a>
		<a class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50" href={`/projects/${data.project.id}/purchase-orders`}>
			<p class="text-xs text-slate-500">Project Submodule</p>
			<p class="mt-1 font-medium text-slate-800">Purchase Orders</p>
		</a>
		<a class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50" href={`/projects/${data.project.id}/expenses`}>
			<p class="text-xs text-slate-500">Project Submodule</p>
			<p class="mt-1 font-medium text-slate-800">Expenses</p>
		</a>
	</section>

	<form class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" method="POST" action="?/update">
		{#if form?.message}
			<p class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</p>
		{/if}

		<div class="grid gap-4 md:grid-cols-2">
			<label class="space-y-1 text-sm">
				<span class="text-slate-700">Project Name</span>
				<input
					name="name"
					required
					value={data.project.name}
					class="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</label>

			<label class="space-y-1 text-sm">
				<span class="text-slate-700">Status</span>
				<select
					name="status"
					class="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
					value={data.project.status}
				>
					<option value="active">active</option>
					<option value="on_hold">on_hold</option>
					<option value="completed">completed</option>
					<option value="archived">archived</option>
				</select>
			</label>

			<label class="space-y-1 text-sm">
				<span class="text-slate-700">Start Date</span>
				<input
					type="date"
					name="startDate"
					value={data.project.startDate ?? ''}
					class="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</label>

			<label class="space-y-1 text-sm">
				<span class="text-slate-700">End Date</span>
				<input
					type="date"
					name="endDate"
					value={data.project.endDate ?? ''}
					class="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</label>
		</div>

		<label class="block space-y-1 text-sm">
			<span class="text-slate-700">Project Description</span>
			<textarea
				name="description"
				rows="4"
				class="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
			>{data.project.description ?? ''}</textarea>
		</label>

		<div class="flex flex-wrap gap-3">
			<button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">
				Save Changes
			</button>
			<a class="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/projects">
				Back to List
			</a>
		</div>
	</form>

	<form method="POST" action="?/delete">
		<button
			type="submit"
			class="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
		>
			Archive and Remove Project
		</button>
	</form>
</PageShell>
