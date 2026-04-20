import { eq } from 'drizzle-orm';

import type { DocumentMetadata } from '$lib/server/document-metadata';
import type { DBClient } from '$lib/server/db';
import { schema } from '$lib/server/modules/legacy-db';
import { r2FileUrls } from '$lib/server/r2-file-urls';

export const EXPENSE_DOCUMENT_ID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inferKindFromFileName(name: string | null | undefined): 'pdf' | 'image' | null {
	if (!name) return null;
	const n = name.toLowerCase();
	if (n.endsWith('.pdf')) return 'pdf';
	if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(n)) return 'image';
	return null;
}

function inferKindFromStorageKey(key: string | null | undefined): 'pdf' | 'image' | null {
	if (!key) return null;
	const tail = key.split('/').pop() ?? key;
	let dec = tail;
	try {
		dec = decodeURIComponent(tail);
	} catch {
		/* keep tail */
	}
	return inferKindFromFileName(dec);
}

function computePreviewDisplay(
	fileViewUrl: string | null,
	docMeta: DocumentMetadata,
	documentsFileType: string | null,
	attachmentFileName: string | null,
	storageKey: string | null
): 'pdf' | 'image' | 'none' | 'other' {
	if (!fileViewUrl) return 'none';
	const fn =
		(docMeta.upload?.fileName?.toLowerCase() ?? '') ||
		(attachmentFileName?.toLowerCase() ?? '');
	const ct = (docMeta.upload?.contentType ?? '').toLowerCase();
	if (ct.includes('pdf') || fn.endsWith('.pdf')) return 'pdf';
	if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(fn)) return 'image';
	if (documentsFileType === 'pdf') return 'pdf';
	if (documentsFileType === 'image') return 'image';
	const fromKey = inferKindFromStorageKey(storageKey);
	if (fromKey) return fromKey;
	return 'other';
}

export async function resolveExpenseFilePreview(
	db: DBClient,
	documentRef: string | null | undefined,
	docMeta: DocumentMetadata
): Promise<{
	fileViewUrl: string | null;
	fileDownloadUrl: string | null;
	previewDisplay: 'pdf' | 'image' | 'none' | 'other';
}> {
	let storageKey: string | null = null;
	let documentsFileType: string | null = null;
	let attachmentFileName: string | null = null;

	const ref = documentRef;
	if (ref && !ref.startsWith('manual://')) {
		if (EXPENSE_DOCUMENT_ID_RE.test(ref)) {
			const [doc] = await db
				.select({
					fileKey: schema.documents.fileKey,
					fileName: schema.documents.fileName,
					fileType: schema.documents.fileType
				})
				.from(schema.documents)
				.where(eq(schema.documents.id, ref))
				.limit(1);
			storageKey = doc?.fileKey ?? null;
			attachmentFileName = doc?.fileName ?? null;
			documentsFileType = doc?.fileType ?? null;
		} else {
			storageKey = ref;
			const [doc] = await db
				.select({
					fileName: schema.documents.fileName,
					fileType: schema.documents.fileType
				})
				.from(schema.documents)
				.where(eq(schema.documents.fileKey, ref))
				.limit(1);
			attachmentFileName = doc?.fileName ?? null;
			documentsFileType = doc?.fileType ?? null;
		}
	}

	const { fileViewUrl, fileDownloadUrl } = r2FileUrls(storageKey);
	const previewDisplay = computePreviewDisplay(
		fileViewUrl,
		docMeta,
		documentsFileType,
		attachmentFileName,
		storageKey
	);

	return { fileViewUrl, fileDownloadUrl, previewDisplay };
}
