<script lang="ts">
	import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-svelte';
	import PageShell from '$app-layer/components/PageShell.svelte';
	import DocumentIntakeDiagnostics from '$app-layer/components/document-intake/DocumentIntakeDiagnostics.svelte';
	import type { DocumentArtifactView } from '$modules/document-intake';

	let { data } = $props();
	const artifact = $derived(data.artifact as DocumentArtifactView);

	const documentTypeLabel: Record<string, string> = {
		supplier_invoice: 'Supplier invoice',
		customer_invoice: 'Customer invoice',
		receipt: 'Receipt',
		purchase_order: 'Purchase order',
		contract: 'Contract',
		quotation: 'Quotation',
		bank_statement: 'Bank statement',
		tax_document: 'Tax document',
		logistics_document: 'Logistics document',
		unknown: 'Unknown'
	};

	const statusLabel: Record<string, string> = {
		received: 'Received',
		stored: 'Stored',
		text_extraction_pending: 'Text extraction pending',
		text_extracted: 'Text extracted',
		ocr_pending: 'OCR pending',
		ocr_completed: 'OCR completed',
		classification_pending: 'Classification pending',
		classified: 'Classified',
		fields_extraction_pending: 'Fields extraction pending',
		ready_for_review: 'Ready for review',
		ready_for_workflow: 'Ready for workflow',
		confirmed: 'Confirmed',
		abandoned: 'Abandoned',
		needs_manual_review: 'Needs manual review',
		failed: 'Failed'
	};

	const sourceLabel: Record<string, string> = {
		manual_upload: 'Manual upload',
		api_upload: 'API upload',
		bulk_zip_upload: 'Bulk ZIP',
		email_attachment: 'Email attachment',
		mobile_scan: 'Mobile scan',
		google_drive: 'Google Drive',
		dropbox: 'Dropbox',
		whatsapp_upload: 'WhatsApp',
		accounting_export: 'Accounting export'
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

	const fileKind = (fileName: string, mimeType: string) => {
		const lowerName = fileName.toLowerCase();
		const lowerMime = mimeType.toLowerCase();
		if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) return 'pdf';
		if (lowerMime.startsWith('image/')) return 'image';
		return 'other';
	};

	const fieldEntries = $derived(
		(artifact.suggestedFields?.fields
			? Object.entries(artifact.suggestedFields.fields as Record<string, unknown>)
			: []
		).filter(([, value]) => value !== null && value !== undefined && value !== '')
	);

	const formatValue = (value: unknown) => {
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}
		return JSON.stringify(value);
	};

	const confidenceFor = (key: string) => {
		const value = artifact.suggestedFields?.confidence?.[key];
		return typeof value === 'number' ? `${Math.round(value * 100)}%` : 'n/a';
	};
</script>

<PageShell
	eyebrow="Finance · Document Hub"
	title={artifact.originalFile.fileName}
	description="Document artifact detail, preview, indexed fields, and original file access."
>
	{#snippet actions()}
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/finance/doc-hub"
				class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
			>
				<ArrowLeft size={14} aria-hidden="true" />
				Back
			</a>
			<a
				href={data.fileViewUrl}
				target="_blank"
				rel="noreferrer"
				class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
			>
				<ExternalLink size={14} aria-hidden="true" />
				Open
			</a>
			<a
				href={data.fileDownloadUrl}
				class="inline-flex items-center gap-1.5 rounded-md bg-[var(--sf-green)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[var(--sf-green-dark)]"
				style="--sf-green: #387234; --sf-green-dark: #2e5d2a;"
			>
				<Download size={14} aria-hidden="true" />
				Download
			</a>
		</div>
	{/snippet}

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
		<section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
				<h2 class="text-sm font-semibold text-slate-900">File preview</h2>
				<span class="text-xs text-slate-500">{artifact.originalFile.mimeType}</span>
			</div>
			<div class="h-[min(72vh,760px)] bg-slate-100">
				{#if fileKind(artifact.originalFile.fileName, artifact.originalFile.mimeType) === 'pdf'}
					<iframe
						src={data.fileViewUrl}
						title="Document file preview"
						class="h-full w-full border-0 bg-white"
					></iframe>
				{:else if fileKind(artifact.originalFile.fileName, artifact.originalFile.mimeType) === 'image'}
					<div class="flex h-full items-center justify-center p-4">
						<img
							src={data.fileViewUrl}
							alt="Document file preview"
							class="max-h-full max-w-full object-contain"
						/>
					</div>
				{:else}
					<div class="flex h-full flex-col items-center justify-center px-6 text-center">
						<FileText size={40} class="text-slate-300" aria-hidden="true" />
						<h2 class="mt-3 text-sm font-semibold text-slate-900">Preview unavailable</h2>
						<p class="mt-1 max-w-sm text-sm text-slate-500">
							This file type can still be opened in a new tab or downloaded from the actions above.
						</p>
					</div>
				{/if}
			</div>
		</section>

		<aside class="space-y-4">
			<section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
				<h2 class="text-sm font-semibold text-slate-900">Artifact metadata</h2>
				<dl class="mt-3 space-y-2 text-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Type</dt>
						<dd class="font-medium text-slate-900">
							{documentTypeLabel[artifact.documentType ?? 'unknown'] ?? artifact.documentType}
						</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Status</dt>
						<dd class="font-medium text-slate-900">
							{statusLabel[artifact.processingStatus] ?? artifact.processingStatus}
						</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Source</dt>
						<dd class="text-slate-900">{sourceLabel[artifact.source] ?? artifact.source}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Size</dt>
						<dd class="font-mono text-slate-900">{formatBytes(artifact.originalFile.sizeBytes)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Created</dt>
						<dd class="text-right text-slate-900">{formatDateTime(artifact.createdAt)}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Updated</dt>
						<dd class="text-right text-slate-900">{formatDateTime(artifact.updatedAt)}</dd>
					</div>
					<div class="pt-2">
						<dt class="text-slate-500">Artifact ID</dt>
						<dd class="mt-1 break-all font-mono text-xs text-slate-700">{artifact.id}</dd>
					</div>
				</dl>
			</section>

			<section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
				<h2 class="text-sm font-semibold text-slate-900">Classification</h2>
				<dl class="mt-3 space-y-2 text-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Category ID</dt>
						<dd class="font-mono text-xs text-slate-900">{artifact.suggestedCategoryId ?? 'n/a'}</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-slate-500">Confidence</dt>
						<dd class="font-mono text-slate-900">
							{artifact.classification?.confidence == null
								? 'n/a'
								: `${Math.round(artifact.classification.confidence * 100)}%`}
						</dd>
					</div>
				</dl>
				{#if artifact.classification?.reason}
					<p class="mt-3 text-sm text-slate-600">{artifact.classification.reason}</p>
				{/if}
			</section>
		</aside>
	</div>

	<section class="rounded-lg border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 px-4 py-3">
			<h2 class="text-sm font-semibold text-slate-900">Indexed fields</h2>
			<p class="mt-0.5 text-xs text-slate-500">Fields extracted into the document artifact search index.</p>
		</div>
		{#if fieldEntries.length === 0}
			<p class="px-4 py-6 text-sm text-slate-500">No extracted fields are stored for this artifact.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-100 text-left text-sm">
					<thead class="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
						<tr>
							<th class="px-4 py-3">Field</th>
							<th class="px-4 py-3">Value</th>
							<th class="px-4 py-3">Confidence</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each fieldEntries as [key, value]}
							<tr>
								<td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{key}</td>
								<td class="max-w-3xl px-4 py-3 text-slate-900">{formatValue(value)}</td>
								<td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
									{confidenceFor(key)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<DocumentIntakeDiagnostics {artifact} />
</PageShell>
