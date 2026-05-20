<script lang="ts">
	import {
		Download,
		Eye,
		FileArchive,
		Filter,
		RefreshCw,
		Search,
		UploadCloud
	} from 'lucide-svelte';
	import PageShell from '$app-layer/components/PageShell.svelte';
	import type { DocumentArtifactView } from '$modules/document-intake';

	let { data } = $props();
	const library = $derived(data.library);
	const items = $derived<DocumentArtifactView[]>(library?.items ?? []);
	const showingStart = $derived(library ? library.offset + 1 : 0);
	const showingEnd = $derived(library ? Math.min(library.offset + items.length, library.total) : 0);
	const totalCount = $derived(library?.total ?? 0);
	const filters = $derived(
		library?.filters ?? {
			q: '',
			status: '',
			documentType: '',
			source: '',
			categoryId: '',
			from: '',
			to: ''
		}
	);

	const statusOptions = [
		['', 'All statuses'],
		['ready_for_review', 'Ready for review'],
		['confirmed', 'Confirmed'],
		['failed', 'Failed'],
		['needs_manual_review', 'Needs manual review'],
		['fields_extraction_pending', 'Extracting fields'],
		['classification_pending', 'Classifying'],
		['stored', 'Stored'],
		['abandoned', 'Abandoned']
	] as const;

	const documentTypeOptions = [
		['', 'All document types'],
		['supplier_invoice', 'Supplier invoice'],
		['customer_invoice', 'Customer invoice'],
		['receipt', 'Receipt'],
		['purchase_order', 'Purchase order'],
		['contract', 'Contract'],
		['quotation', 'Quotation'],
		['bank_statement', 'Bank statement'],
		['tax_document', 'Tax document'],
		['logistics_document', 'Logistics document'],
		['unknown', 'Unknown']
	] as const;

	const sourceOptions = [
		['', 'All sources'],
		['manual_upload', 'Manual upload'],
		['api_upload', 'API upload'],
		['bulk_zip_upload', 'Bulk ZIP'],
		['email_attachment', 'Email attachment'],
		['mobile_scan', 'Mobile scan'],
		['google_drive', 'Google Drive'],
		['dropbox', 'Dropbox'],
		['whatsapp_upload', 'WhatsApp'],
		['accounting_export', 'Accounting export']
	] as const;

	const statusLabel = Object.fromEntries(statusOptions);
	const documentTypeLabel = Object.fromEntries(documentTypeOptions);
	const sourceLabel = Object.fromEntries(sourceOptions);

	const statusTone = (status: string) => {
		switch (status) {
			case 'confirmed':
				return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
			case 'ready_for_review':
				return 'bg-sky-50 text-sky-700 ring-sky-200';
			case 'failed':
			case 'needs_manual_review':
				return 'bg-rose-50 text-rose-700 ring-rose-200';
			case 'abandoned':
				return 'bg-slate-100 text-slate-500 ring-slate-200';
			default:
				return 'bg-amber-50 text-amber-700 ring-amber-200';
		}
	};

	const formatDateTime = (iso: string) => {
		try {
			return new Date(iso).toLocaleString('en-SG', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return iso;
		}
	};

	const formatBytes = (n: number | undefined) => {
		if (!n || n <= 0) return 'n/a';
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	};

	const fieldsPreview = (item: DocumentArtifactView) => {
		const f = item.suggestedFields?.fields as Record<string, unknown> | undefined;
		if (!f) return null;
		const stringValue = (...keys: string[]) => {
			for (const key of keys) {
				const value = f[key];
				if (typeof value === 'string' && value.trim()) return value.trim();
			}
			return null;
		};
		const numberValue = (...keys: string[]) => {
			for (const key of keys) {
				const value = f[key];
				if (typeof value === 'number') return value;
			}
			return null;
		};
		return {
			counterparty: stringValue('supplier_name', 'vendor', 'customer_name', 'client_name'),
			docNo: stringValue(
				'invoice_number',
				'receipt_number',
				'po_number',
				'contract_number',
				'quotation_number'
			),
			amount: numberValue('amount', 'invoice_amount', 'total_amount'),
			currency: stringValue('currency', 'invoice_currency') ?? 'SGD'
		};
	};

	function pageHref(nextPage: number) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(filters)) {
			if (value) params.set(key, value);
		}
		params.set('page', String(nextPage));
		return `/finance/doc-hub?${params.toString()}`;
	}
</script>

<PageShell
	eyebrow="Finance"
	title="Document Hub"
	description="Document artifact library for uploaded files, previews, downloads, and indexed search."
>
	{#snippet actions()}
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/finance/doc-hub"
				class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
			>
				<RefreshCw size={14} aria-hidden="true" />
				Refresh
			</a>
			<a
				href="/finance/doc-hub/upload/project"
				class="inline-flex items-center gap-1.5 rounded-md bg-[var(--sf-green)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[var(--sf-green-dark)]"
				style="--sf-green: #387234; --sf-green-dark: #2e5d2a;"
			>
				<UploadCloud size={14} aria-hidden="true" />
				Upload
			</a>
		</div>
	{/snippet}

	<form method="GET" class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
		<div class="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))]">
			<label class="relative block">
				<span class="sr-only">Search documents</span>
				<Search
					size={16}
					class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
					aria-hidden="true"
				/>
				<input
					name="q"
					value={filters.q}
					class="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-[var(--sf-green)] focus:ring-2 focus:ring-[rgba(56,114,52,0.14)]"
					style="--sf-green: #387234;"
					placeholder="Search filename, extracted text, fields, ID"
				/>
			</label>

			<label>
				<span class="sr-only">Status</span>
				<select
					name="status"
					class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[var(--sf-green)] focus:ring-2 focus:ring-[rgba(56,114,52,0.14)]"
					style="--sf-green: #387234;"
				>
					{#each statusOptions as [value, label]}
						<option {value} selected={filters.status === value}>{label}</option>
					{/each}
				</select>
			</label>

			<label>
				<span class="sr-only">Document type</span>
				<select
					name="documentType"
					class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[var(--sf-green)] focus:ring-2 focus:ring-[rgba(56,114,52,0.14)]"
					style="--sf-green: #387234;"
				>
					{#each documentTypeOptions as [value, label]}
						<option {value} selected={filters.documentType === value}>{label}</option>
					{/each}
				</select>
			</label>

			<label>
				<span class="sr-only">Source</span>
				<select
					name="source"
					class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[var(--sf-green)] focus:ring-2 focus:ring-[rgba(56,114,52,0.14)]"
					style="--sf-green: #387234;"
				>
					{#each sourceOptions as [value, label]}
						<option {value} selected={filters.source === value}>{label}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="mt-3 grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]">
			<input
				name="categoryId"
				value={filters.categoryId}
				class="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[var(--sf-green)] focus:ring-2 focus:ring-[rgba(56,114,52,0.14)]"
				style="--sf-green: #387234;"
				placeholder="Category ID"
			/>
			<input
				name="from"
				type="date"
				value={filters.from}
				class="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[var(--sf-green)] focus:ring-2 focus:ring-[rgba(56,114,52,0.14)]"
				style="--sf-green: #387234;"
			/>
			<input
				name="to"
				type="date"
				value={filters.to}
				class="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[var(--sf-green)] focus:ring-2 focus:ring-[rgba(56,114,52,0.14)]"
				style="--sf-green: #387234;"
			/>
			<button
				type="submit"
				class="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
			>
				<Filter size={15} aria-hidden="true" />
				Apply
			</button>
			<a
				href="/finance/doc-hub"
				class="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
			>
				Clear
			</a>
		</div>
	</form>

	{#if data.error}
		<div class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{data.error}
		</div>
	{:else if items.length === 0}
		<section class="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
			<FileArchive class="mx-auto text-slate-300" size={36} aria-hidden="true" />
			<h2 class="mt-3 text-base font-semibold text-slate-900">No files match this index query</h2>
			<p class="mt-1 text-sm text-slate-500">Change the filters or upload a new document artifact.</p>
		</section>
	{:else}
		<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
			<div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
				<div>
					<h2 class="text-sm font-semibold text-slate-900">Uploaded files</h2>
					<p class="mt-0.5 text-xs text-slate-500">
						Showing {showingStart}-{showingEnd} of {totalCount}
					</p>
				</div>
				<p class="text-xs font-medium text-slate-500">10 per page</p>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-100 text-left">
					<thead class="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
						<tr>
							<th class="px-4 py-3">File</th>
							<th class="px-4 py-3">Index</th>
							<th class="px-4 py-3">Status</th>
							<th class="px-4 py-3">Uploaded</th>
							<th class="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each items as item (item.id)}
							{@const preview = fieldsPreview(item)}
							<tr class="hover:bg-slate-50">
								<td class="max-w-[22rem] px-4 py-3">
									<a
										href={`/finance/doc-hub/${item.id}`}
										class="block truncate text-sm font-medium text-slate-900 hover:text-[var(--sf-green)]"
										style="--sf-green: #387234;"
									>
										{item.originalFile.fileName}
									</a>
									<div class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
										<span>{formatBytes(item.originalFile.sizeBytes)}</span>
										<span>{item.originalFile.mimeType}</span>
										<span class="font-mono">{item.id.slice(0, 8)}</span>
									</div>
								</td>
								<td class="px-4 py-3 text-xs text-slate-600">
									<div class="font-medium text-slate-800">
										{documentTypeLabel[item.documentType ?? 'unknown'] ?? item.documentType ?? 'Unknown'}
									</div>
									<div class="mt-1 flex flex-wrap gap-x-2 gap-y-1">
										{#if preview?.counterparty}
											<span>{preview.counterparty}</span>
										{/if}
										{#if preview?.docNo}
											<span class="font-mono">{preview.docNo}</span>
										{/if}
										{#if preview?.amount !== null && preview?.amount !== undefined}
											<span>{preview.currency} {preview.amount.toLocaleString('en-SG')}</span>
										{/if}
										{#if item.suggestedCategoryId}
											<span>{item.suggestedCategoryId}</span>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3">
									<span
										class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset {statusTone(
											item.processingStatus
										)}"
									>
										{statusLabel[item.processingStatus] ?? item.processingStatus}
									</span>
									<div class="mt-1 text-xs text-slate-500">
										{sourceLabel[item.source] ?? item.source}
									</div>
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
									{formatDateTime(item.createdAt)}
								</td>
								<td class="px-4 py-3">
									<div class="flex justify-end gap-1.5">
										<a
											href={`/finance/doc-hub/${item.id}`}
											class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
											title="View detail"
										>
											<Eye size={15} aria-hidden="true" />
										</a>
										<a
											href={`/api/documents/${item.id}/file?download=1`}
											class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
											title="Download file"
										>
											<Download size={15} aria-hidden="true" />
										</a>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<nav class="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
				<a
					href={pageHref(Math.max((library?.page ?? 1) - 1, 1))}
					aria-disabled={(library?.page ?? 1) <= 1}
					class="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-40"
				>
					Previous
				</a>
				<span class="text-sm text-slate-500">
					Page {library?.page ?? 1} of {library?.totalPages ?? 1}
				</span>
				<a
					href={pageHref(Math.min((library?.page ?? 1) + 1, library?.totalPages ?? 1))}
					aria-disabled={(library?.page ?? 1) >= (library?.totalPages ?? 1)}
					class="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-40"
				>
					Next
				</a>
			</nav>
		</section>
	{/if}
</PageShell>
