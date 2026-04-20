<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	import {
		EXPENSE_CATEGORY_OPTIONS,
		CATEGORY_LABELS,
		EXPENSE_TYPE_LABELS,
		type ExpenseType
	} from '$lib/constants/expense-upload';

	let { data } = $props();

	const money = (value: number, currency = 'SGD') =>
		new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format(value ?? 0);

	let showManualEntry = $state(false);
	let filterType = $state<'all' | ExpenseType>('all');

	const filteredExpenses = $derived.by(() => {
		return data.expenses.filter((exp) => {
			if (filterType !== 'all' && exp.expenseType !== filterType) return false;
			return true;
		});
	});

	const typeLabel = (t: string | null) => {
		return t === 'sales_cost' ? 'Sales Cost' : 'OpEx';
	};

	const categoryLabel = (c: string) => {
		return (CATEGORY_LABELS as Record<string, string>)[c] ?? c;
	};
</script>

<PageShell
	eyebrow="Finance"
	title="Company Expenses"
	description="Manage all expenses — operating costs and sales costs."
>
	<!-- Summary cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Expenses</p>
			<p class="mt-1 text-xl font-semibold text-slate-900">{money(data.totals.total)}</p>
		</div>
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Operating Expenses</p>
			<p class="mt-1 text-xl font-semibold text-slate-900">{money(data.totals.opex)}</p>
		</div>
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Sales Cost</p>
			<p class="mt-1 text-xl font-semibold text-slate-900">{money(data.totals.salesCost)}</p>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<select
				bind:value={filterType}
				class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
			>
				<option value="all">All Types</option>
				<option value="opex">Operating Expenses</option>
				<option value="sales_cost">Sales Cost</option>
			</select>
		</div>
		<div class="flex items-center gap-2">
			<a
				class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				href="/expenses/upload"
			>
				Upload Document
			</a>
			<a
				class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				href="/expenses/reimbursements"
			>
				Reimbursements
			</a>
			<button
				type="button"
				class="rounded-md bg-[var(--sf-green)] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f5e2c]"
				onclick={() => (showManualEntry = true)}
			>
				Manual Entry
			</button>
		</div>
	</div>

	<!-- Expense table -->
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<table class="min-w-full divide-y divide-slate-200 text-sm">
			<thead class="bg-slate-50 text-left text-slate-600">
				<tr>
					<th class="px-4 py-3 font-medium">Type</th>
					<th class="px-4 py-3 font-medium">Date</th>
					<th class="px-4 py-3 font-medium">Category</th>
					<th class="px-4 py-3 font-medium">Name/Vendor</th>
					<th class="px-4 py-3 font-medium text-right">Amount</th>
					<th class="px-4 py-3 font-medium">Tags</th>
					<th class="px-4 py-3 font-medium">Notes</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#if filteredExpenses.length === 0}
					<tr>
						<td class="px-4 py-8 text-center text-slate-500" colspan="7">
							No expenses found. Upload a document or create a manual entry.
						</td>
					</tr>
				{:else}
					{#each filteredExpenses as expense}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3">
								<span
									class="rounded px-2 py-0.5 text-xs font-medium {expense.expenseType === 'sales_cost'
										? 'bg-sky-100 text-sky-700'
										: 'bg-purple-100 text-purple-700'}"
								>
									{typeLabel(expense.expenseType)}
								</span>
							</td>
							<td class="px-4 py-3 text-slate-600">{expense.date}</td>
							<td class="px-4 py-3 text-slate-600">{categoryLabel(expense.category)}</td>
							<td class="px-4 py-3 font-medium text-slate-800">
								{expense.vendorOrSupplier || expense.staffName || '-'}
							</td>
							<td class="px-4 py-3 text-right font-medium text-slate-800">
								{money(expense.amount, expense.currency)}
								{#if expense.currency !== 'SGD' && expense.sgdEquivalent}
									<span class="block text-xs text-slate-500">{money(expense.sgdEquivalent)}</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap gap-1">
									{#if expense.reimbursement}
										<span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Reimb</span>
									{/if}
									{#if expense.businessTrip}
										<span class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Trip</span>
									{/if}
									{#if expense.projectId}
										<span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Project</span>
									{/if}
								</div>
							</td>
							<td class="px-4 py-3 max-w-[200px] truncate text-slate-500 text-xs">
								{expense.notes || '-'}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</PageShell>

<!-- Manual entry modal -->
{#if showManualEntry}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Close"
			onclick={() => (showManualEntry = false)}
		></button>
		<div class="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
			<div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
				<h3 class="text-base font-semibold text-slate-900">Manual Expense Entry</h3>
				<p class="text-sm text-slate-500">录入即确认，无需文件附件。</p>
			</div>
			<form method="POST" action="?/create" class="space-y-4 p-5">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-700" for="date">Date</label>
						<input
							type="date"
							id="date"
							name="date"
							class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
							value={new Date().toISOString().slice(0, 10)}
							required
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700" for="expenseType">Expense Type</label>
						<select
							id="expenseType"
							name="expenseType"
							class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						>
							<option value="opex">Operating Expenses</option>
							<option value="sales_cost">Sales Cost</option>
						</select>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700" for="category">Category</label>
					<select
						id="category"
						name="category"
						class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						required
					>
						<optgroup label="Operating Expenses">
							{#each EXPENSE_CATEGORY_OPTIONS.opex as cat}
								<option value={cat}>{CATEGORY_LABELS[cat]}</option>
							{/each}
						</optgroup>
						<optgroup label="Sales Cost">
							{#each EXPENSE_CATEGORY_OPTIONS.sales_cost as cat}
								<option value={cat}>{CATEGORY_LABELS[cat]}</option>
							{/each}
						</optgroup>
					</select>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-700" for="amount">Amount</label>
						<input
							type="number"
							id="amount"
							name="amount"
							step="0.01"
							class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
							required
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700" for="currency">Currency</label>
						<select
							id="currency"
							name="currency"
							class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						>
							<option value="SGD">SGD</option>
							<option value="USD">USD</option>
							<option value="CNY">CNY</option>
						</select>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-slate-700" for="vendorOrSupplier">Vendor/Supplier</label>
						<input
							type="text"
							id="vendorOrSupplier"
							name="vendorOrSupplier"
							class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
							placeholder="e.g. ChatGPT, Grab"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-slate-700" for="staffName">Staff Name</label>
						<select
							id="staffName"
							name="staffName"
							class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						>
							<option value="">-- none --</option>
							{#each data.employees as emp}
								<option value={emp.name}>{emp.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="flex items-center gap-6">
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" name="reimbursement" class="rounded border-slate-300" />
						Reimbursement
					</label>
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" name="businessTrip" class="rounded border-slate-300" />
						Business Trip
					</label>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700" for="destination">Destination (if trip)</label>
					<input
						type="text"
						id="destination"
						name="destination"
						class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						placeholder="出差目的地"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700" for="notes">Notes</label>
					<textarea
						id="notes"
						name="notes"
						rows="2"
						class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						placeholder="备注说明"
					></textarea>
				</div>
				<div class="flex justify-end gap-2 border-t border-slate-200 pt-4">
					<button
						type="button"
						class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
						onclick={() => (showManualEntry = false)}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-[var(--sf-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5e2c]"
					>
						Create Expense
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
