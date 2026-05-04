import { and, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

import { fail, ok } from '$lib/server/http';
import { runOcrPipeline } from '$lib/server/ocr/pipeline';
import { detectExpenseFieldsFromOcr } from '$lib/server/ocr/expense-detection';
import { getDb, schema } from '$lib/server/modules/legacy-db';
import {
	CATEGORY_DOC_TYPE_MAP,
	EXPENSE_CATEGORY_OPTIONS,
	isValidExpenseCategory,
	type ExpenseCategory,
	type ExpenseType
} from '$lib/constants/expense-upload';

const IMAGE_MIME = /^image\//i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i;
const DESCRIPTION_PHRASES = [
	'partially visible',
	'is displayed',
	'resting on a surface',
	'suggesting',
	'appears to be',
	'in the lower right corner',
	'a hand is',
	'this image shows'
];

function isPdfOrImage(fileType: string, fileName: string): boolean {
	const mime = (fileType || '').toLowerCase();
	const name = (fileName || '').toLowerCase();
	return mime === 'application/pdf' || IMAGE_MIME.test(mime) || name.endsWith('.pdf') || IMAGE_EXT.test(name);
}

function isPdfFile(fileType: string, fileName: string): boolean {
	const mime = (fileType || '').toLowerCase();
	const name = (fileName || '').toLowerCase();
	return mime === 'application/pdf' || name.endsWith('.pdf');
}

function isImageFile(fileType: string, fileName: string): boolean {
	const mime = (fileType || '').toLowerCase();
	const name = (fileName || '').toLowerCase();
	return IMAGE_MIME.test(mime) || IMAGE_EXT.test(name);
}

function looksLikeImageSceneDescription(raw: string): boolean {
	const text = raw.trim().toLowerCase();
	if (!text) return false;
	const hit = DESCRIPTION_PHRASES.some((p) => text.includes(p));
	// OCR text usually has line-heavy tokens and identifiers; pure caption text tends to be prose.
	const tokenDensity = (text.match(/\b(invoice|total|date|gst|tax|po|receipt|amount|sgd|usd|cny)\b/g) ?? [])
		.length;
	return hit || (text.length > 80 && tokenDensity <= 1 && !/\d{2,}/.test(text));
}

async function tryMarkdownTextFromWorkersAi(file: File, env: Env): Promise<string> {
	const ai = (env as unknown as { AI?: { toMarkdown?: (docs: Array<{ name: string; blob: Blob }>) => Promise<unknown> } }).AI;
	if (!ai?.toMarkdown) return '';
	try {
		const result = await ai.toMarkdown([{ name: file.name || 'document.pdf', blob: file }]);
		if (!Array.isArray(result) || result.length === 0) return '';
		const first = result[0] as { data?: unknown };
		return typeof first?.data === 'string' ? first.data.trim() : '';
	} catch {
		return '';
	}
}

/**
 * POST /api/expenses/detect
 *
 * Runs OCR + structured extraction on the uploaded file **without** persisting
 * R2 / documents / expenses. Used by the expense upload UI as an optional
 * pre-submit step to suggest form values.
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const form = await request.formData();
	const documentIdRaw = String(form.get('documentId') || '').trim();
	const formFile = form.get('file');

	let file: File;
	if (documentIdRaw && !(formFile instanceof File && formFile.size > 0)) {
		// 两段式：客户端只传 documentId，服务端用 documents.fileKey 从 R2 取回
		const db = getDb(platform.env);
		const [row] = await db
			.select({
				id: schema.documents.id,
				fileKey: schema.documents.fileKey,
				fileName: schema.documents.fileName,
				fileType: schema.documents.fileType
			})
			.from(schema.documents)
			.where(and(eq(schema.documents.id, documentIdRaw), isNull(schema.documents.deletedAt)))
			.limit(1);
		if (!row) return fail('documentId not found', 404);

		const obj = await platform.env.R2.get(row.fileKey);
		if (!obj) return fail('Stored object missing in R2', 404);

		const buf = await obj.arrayBuffer();
		const lower = (row.fileName || '').toLowerCase();
		const inferredMime =
			row.fileType === 'pdf' || lower.endsWith('.pdf')
				? 'application/pdf'
				: row.fileType === 'image'
					? lower.endsWith('.png')
						? 'image/png'
						: lower.endsWith('.webp')
							? 'image/webp'
							: 'image/jpeg'
					: 'application/octet-stream';
		file = new File([buf], row.fileName || 'document', { type: inferredMime });
	} else if (formFile instanceof File && formFile.size > 0) {
		file = formFile;
	} else {
		return fail('Missing file: provide multipart "file" or form field "documentId"', 400);
	}

	const expenseTypeRaw = String(form.get('expenseType') || 'opex');
	const categoryRaw = String(form.get('category') || '');
	const docTypeRaw = String(form.get('docType') || '');

	const expenseType: ExpenseType = expenseTypeRaw === 'sales_cost' ? 'sales_cost' : 'opex';
	const fallbackCategory = EXPENSE_CATEGORY_OPTIONS[expenseType][0] as ExpenseCategory;
	const category = isValidExpenseCategory(expenseType, categoryRaw)
		? (categoryRaw as ExpenseCategory)
		: fallbackCategory;
	const docType = (docTypeRaw || CATEGORY_DOC_TYPE_MAP[category] || null) as
		| 'invoice'
		| 'receipt'
		| 'po'
		| null;

	const bytes = await file.arrayBuffer();
	const fileType = file.type || 'application/octet-stream';
	const clientRawText = String(form.get('rawText') || '');
	let trustedRawText = clientRawText.trim();

	// 图片 OCR 结果若像场景描述（caption）则不信任，避免“a hand is visible ...”污染提取。
	if (trustedRawText && isImageFile(fileType, file.name) && looksLikeImageSceneDescription(trustedRawText)) {
		trustedRawText = '';
	}

	// 仅 PDF 走 toMarkdown。图片优先走 OCR（runOcrPipeline -> runImageDocumentOcr）。
	if (!trustedRawText && isPdfFile(fileType, file.name)) {
		trustedRawText = await tryMarkdownTextFromWorkersAi(file, platform.env);
	}

	let extracted: Awaited<ReturnType<typeof runOcrPipeline>>;
	try {
		extracted = await runOcrPipeline(fileType, bytes, platform.env, {
			fileName: file.name,
			rawTextOverride: trustedRawText || undefined,
			guidance: {
				expenseType,
				category,
				docType
			}
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		const stack = e instanceof Error ? e.stack : '';
		return fail(`OCR pipeline failed: ${message}`, 500, {
			message,
			stack: stack?.slice(0, 1500) ?? '',
			fileType,
			fileSize: bytes.byteLength,
			env: {
				PADDLE_OCR_URL: platform.env.PADDLE_OCR_URL ?? 'undefined',
				OCR_PROVIDER: platform.env.OCR_PROVIDER ?? 'undefined'
			},
			context: { expenseType: expenseTypeRaw, category: categoryRaw }
		});
	}

	let detect: Awaited<ReturnType<typeof detectExpenseFieldsFromOcr>>;
	try {
		detect = await detectExpenseFieldsFromOcr(
			{
				expenseType,
				category,
				docType
			},
			extracted,
			platform.env
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		const stack = e instanceof Error ? e.stack : '';
		return fail(`LLM extraction failed: ${message}`, 500, {
			message,
			stack: stack?.slice(0, 1500) ?? '',
			ocrExtracted: extracted,
			context: { expenseType, category, docType }
		});
	}

	return ok({
		fileName: file.name,
		fileType,
		ocr: {
			extractionMethod: extracted.extractionMethod,
			ocrProvider: extracted.ocrProvider,
			llmProvider: extracted.llmProvider,
			warnings: extracted.validationWarnings ?? []
		},
		context: {
			expenseType,
			category,
			docType
		},
		suggestions: detect.suggestions,
		metaHints: detect.metadataHints,
		confidence: detect.confidence,
		provider: detect.provider,
		fieldSpecs: detect.fieldSpecs,
		extracted: detect.extracted,
		rawTextPreview: extracted.rawText?.slice(0, 8000) ?? '',
		rawTextLength: extracted.rawText?.length ?? 0
	});
};
