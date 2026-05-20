import type { RequestHandler } from './$types';

import { fail, ok } from '$platform/http';
import {
	createDocumentIntakeService,
	type DocumentProcessingStatus,
	type DocumentSource,
	type DocumentType
} from '$modules/document-intake';
import { getDb } from '../../../../infrastructure/db';

const PAGE_SIZE = 10;

const ALLOWED_STATUSES: DocumentProcessingStatus[] = [
	'received',
	'stored',
	'text_extraction_pending',
	'text_extracted',
	'ocr_pending',
	'ocr_completed',
	'classification_pending',
	'classified',
	'fields_extraction_pending',
	'ready_for_review',
	'ready_for_workflow',
	'confirmed',
	'abandoned',
	'needs_manual_review',
	'failed'
];

const ALLOWED_TYPES: DocumentType[] = [
	'supplier_invoice',
	'receipt',
	'purchase_order',
	'customer_invoice',
	'logistics_document',
	'contract',
	'quotation',
	'bank_statement',
	'tax_document',
	'unknown'
];

const ALLOWED_SOURCES: DocumentSource[] = [
	'manual_upload',
	'email_attachment',
	'google_drive',
	'dropbox',
	'whatsapp_upload',
	'mobile_scan',
	'accounting_export',
	'bulk_zip_upload',
	'api_upload'
];

function parseCsv<T extends string>(raw: string | null, allowed: readonly T[]): T[] | undefined {
	if (!raw) return undefined;
	const values = raw
		.split(',')
		.map((value) => value.trim())
		.filter((value): value is T => (allowed as readonly string[]).includes(value));
	return values.length ? values : undefined;
}

function parseIsoDate(raw: string | null, endOfDay = false): string | undefined {
	if (!raw) return undefined;
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
		? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
		: raw;
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toISOString();
}

export const GET: RequestHandler = async (event) => {
	if (!event.platform) return fail('Cloudflare platform bindings are required', 500);
	const user = event.locals.user;
	if (!user) return fail('Unauthorized', 401);

	const params = event.url.searchParams;
	const page = Math.max(Number(params.get('page') ?? '1') || 1, 1);
	const limit = PAGE_SIZE;
	const offset = (page - 1) * limit;

	const db = getDb(event.platform.env);
	const service = createDocumentIntakeService({ db, env: event.platform.env, user });
	const result = await service.listDocumentArtifacts({
		tenantId: 'default',
		q: params.get('q') ?? undefined,
		statuses: parseCsv(params.get('status'), ALLOWED_STATUSES),
		documentTypes: parseCsv(params.get('documentType'), ALLOWED_TYPES),
		sources: parseCsv(params.get('source'), ALLOWED_SOURCES),
		categoryId: params.get('categoryId') ?? undefined,
		createdFrom: parseIsoDate(params.get('from')),
		createdTo: parseIsoDate(params.get('to'), true),
		limit,
		offset
	});

	return ok({
		...result,
		page,
		pageSize: limit,
		totalPages: Math.max(Math.ceil(result.total / limit), 1),
		filters: {
			q: params.get('q') ?? '',
			status: params.get('status') ?? '',
			documentType: params.get('documentType') ?? '',
			source: params.get('source') ?? '',
			categoryId: params.get('categoryId') ?? '',
			from: params.get('from') ?? '',
			to: params.get('to') ?? ''
		}
	});
};
