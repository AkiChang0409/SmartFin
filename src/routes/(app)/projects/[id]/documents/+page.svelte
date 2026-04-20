<script lang="ts">
	let { data } = $props();
const contracts = $derived(data.contracts ?? []);
const quotations = $derived(data.quotations ?? []);
const purchaseOrders = $derived(data.purchaseOrders ?? []);

	const money = (value: number | null, currency = 'SGD') =>
		value != null
			? new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format(value)
			: '-';

	const formatDate = (date: string | null) => {
		if (!date) return '-';
		return new Date(date).toLocaleDateString('en-SG', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const docTypeLabel = (type: string) => {
		const labels: Record<string, string> = {
			contract: 'Contract',
			po: 'Purchase Order',
			bom: 'BOM',
			quotation: 'Quotation',
			other: 'Other'
		};
		return labels[type] || type;
	};

	const statusBadgeClass = (status: string | null) => {
		switch (status) {
			case 'active':
			case 'confirmed':
			case 'accepted':
				return 'bg-emerald-100 text-emerald-700';
			case 'draft':
			case 'sent':
				return 'bg-amber-100 text-amber-700';
			case 'completed':
			case 'fulfilled':
				return 'bg-blue-100 text-blue-700';
			case 'terminated':
			case 'rejected':
			case 'expired':
				return 'bg-red-100 text-red-700';
			default:
				return 'bg-slate-100 text-slate-600';
		}
	};

	const totalDocs = $derived(
		data.documents.length + contracts.length + quotations.length + purchaseOrders.length
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-xl font-semibold text-slate-900">Reference Documents</h1>
		<p class="mt-1 text-sm text-slate-500">
			Contracts, quotations, purchase orders, and other project reference files.
		</p>
	</div>

	<!-- Summary -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Documents</p>
			<p class="mt-1 text-2xl font-semibold text-slate-900">{totalDocs}</p>
		</div>
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Contracts</p>
			<p class="mt-1 text-2xl font-semibold text-slate-900">{contracts.length}</p>
		</div>
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Quotations</p>
			<p class="mt-1 text-2xl font-semibold text-slate-900">{quotations.length}</p>
		</div>
		<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
			<p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Purchase Orders</p>
			<p class="mt-1 text-2xl font-semibold text-slate-900">{purchaseOrders.length}</p>
		</div>
	</div>

	<!-- Upload actions -->
	<div class="flex flex-wrap items-center gap-2">
		<a
			class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
			href={`/finance/doc-hub/upload/project?projectId=${encodeURIComponent(data.project.id)}&docType=contract`}
		>
			Upload Contract
		</a>
		<a
			class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
			href={`/finance/doc-hub/upload/project?projectId=${encodeURIComponent(data.project.id)}&docType=quotation`}
		>
			Upload Quotation
		</a>
		<a
			class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
			href={`/finance/doc-hub/upload/project?projectId=${encodeURIComponent(data.project.id)}&docType=purchase_order`}
		>
			Upload PO
		</a>
	</div>

	<!-- Contracts section -->
	{#if contracts.length > 0}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-200 bg-slate-50 px-5 py-3">
				<h3 class="text-sm font-semibold text-slate-900">Contracts</h3>
			</div>
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-white text-left text-slate-600">
					<tr>
						<th class="px-4 py-3 font-medium">Date</th>
						<th class="px-4 py-3 font-medium">Amount</th>
						<th class="px-4 py-3 font-medium">Status</th>
						<th class="px-4 py-3 font-medium">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each contracts as contract}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 text-slate-600">{formatDate(contract.date)}</td>
							<td class="px-4 py-3 font-medium text-slate-800">
								{money(contract.amount, contract.currency || 'SGD')}
							</td>
							<td class="px-4 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadgeClass(contract.status)}">
									{contract.status || 'draft'}
								</span>
							</td>
							<td class="px-4 py-3">
								<a
									class="text-[var(--sf-green)] hover:underline"
									href="/projects/{data.project.id}/contracts/{contract.id}"
								>
									View
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Quotations section -->
	{#if quotations.length > 0}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-200 bg-slate-50 px-5 py-3">
				<h3 class="text-sm font-semibold text-slate-900">Quotations</h3>
			</div>
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-white text-left text-slate-600">
					<tr>
						<th class="px-4 py-3 font-medium">Date</th>
						<th class="px-4 py-3 font-medium">Amount</th>
						<th class="px-4 py-3 font-medium">Status</th>
						<th class="px-4 py-3 font-medium">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each quotations as quotation}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 text-slate-600">{formatDate(quotation.date)}</td>
							<td class="px-4 py-3 font-medium text-slate-800">
								{money(quotation.amount, quotation.currency || 'SGD')}
							</td>
							<td class="px-4 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadgeClass(quotation.status)}">
									{quotation.status || 'draft'}
								</span>
							</td>
							<td class="px-4 py-3">
								<a
									class="text-[var(--sf-green)] hover:underline"
									href="/projects/{data.project.id}/quotations/{quotation.id}"
								>
									View
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Purchase Orders section -->
	{#if purchaseOrders.length > 0}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-200 bg-slate-50 px-5 py-3">
				<h3 class="text-sm font-semibold text-slate-900">Purchase Orders</h3>
			</div>
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-white text-left text-slate-600">
					<tr>
						<th class="px-4 py-3 font-medium">PO Number</th>
						<th class="px-4 py-3 font-medium">Supplier</th>
						<th class="px-4 py-3 font-medium">Date</th>
						<th class="px-4 py-3 font-medium">Amount</th>
						<th class="px-4 py-3 font-medium">Status</th>
						<th class="px-4 py-3 font-medium">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each purchaseOrders as po}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 font-medium text-slate-800">{po.poNumber}</td>
							<td class="px-4 py-3 text-slate-600">{po.supplierName || '-'}</td>
							<td class="px-4 py-3 text-slate-600">{formatDate(po.date)}</td>
							<td class="px-4 py-3 font-medium text-slate-800">
								{money(po.amount, po.currency || 'SGD')}
							</td>
							<td class="px-4 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadgeClass(po.status)}">
									{po.status || 'draft'}
								</span>
							</td>
							<td class="px-4 py-3">
								<a
									class="text-[var(--sf-green)] hover:underline"
									href="/projects/{data.project.id}/purchase-orders/{po.id}"
								>
									View
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Other reference documents -->
	{#if data.documents.length > 0}
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-200 bg-slate-50 px-5 py-3">
				<h3 class="text-sm font-semibold text-slate-900">Other Documents</h3>
			</div>
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-white text-left text-slate-600">
					<tr>
						<th class="px-4 py-3 font-medium">File Name</th>
						<th class="px-4 py-3 font-medium">Type</th>
						<th class="px-4 py-3 font-medium">Uploaded</th>
						<th class="px-4 py-3 font-medium">Notes</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.documents as doc}
						<tr class="hover:bg-slate-50">
							<td class="px-4 py-3 font-medium text-slate-800">{doc.fileName}</td>
							<td class="px-4 py-3">
								<span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
									{docTypeLabel(doc.docType)}
								</span>
							</td>
							<td class="px-4 py-3 text-slate-600">{formatDate(doc.createdAt)}</td>
							<td class="px-4 py-3 text-slate-600">{doc.notes || '-'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Empty state -->
	{#if totalDocs === 0}
		<div class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
			<p class="text-slate-500">No documents uploaded yet.</p>
			<p class="mt-2 text-sm text-slate-400">
				Upload contracts, quotations, or purchase orders to keep project references organized.
			</p>
		</div>
	{/if}
</div>
