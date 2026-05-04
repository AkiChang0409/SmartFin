import { strFromU8, unzipSync } from 'fflate';
import { extractStructuredDocumentFields } from './llm-extract';
import { runImageDocumentOcr } from './image-document-ocr';
import type { OcrPipelineExtract } from './types';
import type { ExpenseCategory, ExpenseDocType, ExpenseType } from '$lib/constants/expense-upload';

const IMAGE_MIME = /^image\//i;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i;

// ---------------------------------------------------------------------------
// NOTE: DO NOT decode PDF bytes as UTF-8 text.
// That yields object-structure noise such as `%PDF-1.4`, `1 0 obj`, etc.
// For PDFs we only trust caller-provided extracted text (e.g. pdfjs / OCR).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DOCX — unzip + parse <w:t> nodes (same logic as $lib/docx/extract-plain-text)
// ---------------------------------------------------------------------------

function docxXmlToPlainText(xml: string): string {
	const paragraphs: string[] = [];
	const pRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
	let m: RegExpExecArray | null;
	while ((m = pRegex.exec(xml)) !== null) {
		const pxml = m[0];
		const parts: string[] = [];
		const tRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
		let tm: RegExpExecArray | null;
		while ((tm = tRe.exec(pxml)) !== null) {
			parts.push(
				tm[1]
					.replace(/&amp;/g, '&')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&quot;/g, '"')
					.replace(/&apos;/g, "'")
			);
		}
		const line = parts.join('').replace(/\s+/g, ' ').trim();
		if (line) paragraphs.push(line);
	}
	return paragraphs.join('\n').trim();
}

function extractDocxText(bytes: ArrayBuffer): string {
	try {
		const files = unzipSync(new Uint8Array(bytes));
		const xmlBytes = files['word/document.xml'];
		if (!xmlBytes) return '';
		const xml = strFromU8(xmlBytes, false);
		return docxXmlToPlainText(xml);
	} catch {
		return '';
	}
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function readEnvString(env: Env, key: string): string {
	const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
	const fromPlatform = (env as unknown as Record<string, unknown>)[key];
	if (typeof fromPlatform === 'string' && fromPlatform.trim()) return fromPlatform.trim();
	const fromProcess = processEnv?.[key];
	return typeof fromProcess === 'string' ? fromProcess.trim() : '';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * OCR / text-extraction pipeline.
 *
 * PDF  → raw UTF-8 decode (null bytes stripped) — same as SmartFinOnline
 * DOCX → fflate unzip + <w:t> node extraction
 * Image → stub pending image OCR
 */
export async function runOcrPipeline(
	fileType: string,
	bytes: ArrayBuffer,
	env: Env,
	opts?: {
		fileName?: string;
		rawTextOverride?: string;
		/** Optional business context to guide OCR attention (still returns full raw transcription). */
		guidance?: {
			expenseType?: ExpenseType;
			category?: ExpenseCategory;
			docType?: ExpenseDocType | null;
		};
	}
): Promise<OcrPipelineExtract> {
	const fileName = (opts?.fileName ?? '').toLowerCase();
	const mime = (fileType || '').toLowerCase();

	const isPdf = mime === 'application/pdf' || fileName.endsWith('.pdf');
	const isDocx =
		mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		mime === 'application/msword' ||
		fileName.endsWith('.docx') ||
		fileName.endsWith('.doc');
	const isImage = IMAGE_MIME.test(mime) || IMAGE_EXT.test(fileName);

	const promptVersion = readEnvString(env, 'OCR_PROMPT_VERSION') || 'v1';

	// Use caller-provided text when available (browser/mobile/Workers AI extraction is preferred).
	if (opts?.rawTextOverride && opts.rawTextOverride.trim().length > 0) {
		const overrideText = opts.rawTextOverride.trim();
		const extracted = await extractStructuredDocumentFields(overrideText, {
			llmProvider: 'external',
			promptVersion,
			env
		});
		const llmDidWork = extracted.llmProvider !== 'heuristic';
		const confidence = llmDidWork ? 0.85 : 0.55;
		const confidenceBand: OcrPipelineExtract['confidenceBand'] = confidence >= 0.75 ? 'high' : 'medium';
		return {
			documentDate: extracted.documentDate,
			totalAmount: extracted.totalAmount,
			currency: extracted.currency,
			supplierName: extracted.supplierName,
			gstAmount: extracted.gstAmount,
			poNumber: extracted.poNumber,
			dueDate: extracted.dueDate,
			confidence,
			confidenceBand,
			needsReview: confidence < 0.75,
			validationWarnings: [],
			sourceSnippets: {},
			extractionMethod: isDocx ? 'docx_text' : isImage ? 'external_ocr' : 'pdf_text',
			ocrProvider: isDocx ? 'docx_native' : isImage ? 'workers_ai' : 'builtin_pdf',
			llmProvider: extracted.llmProvider,
			promptVersion,
			rawText: overrideText
		};
	}

	if (isImage) {
		const ocrResult = await runImageDocumentOcr(env, {
			imageBytes: new Uint8Array(bytes),
			mimeType: mime || 'image/jpeg',
			fileName: opts?.fileName ?? '',
			guidance: opts?.guidance
		});
		if (!ocrResult.ok) {
			return {
				documentDate: null, totalAmount: null, currency: null, supplierName: null,
				gstAmount: null, poNumber: null, dueDate: null,
				confidence: 0, confidenceBand: 'low', needsReview: true,
				validationWarnings: [`Image OCR failed: ${ocrResult.error}`],
				sourceSnippets: {}, extractionMethod: 'external_ocr', ocrProvider: 'workers_ai',
				llmProvider: 'heuristic', promptVersion, rawText: ''
			};
		}
		const imageText = ocrResult.text.trim();
		if (imageText.length < 50) {
			return {
				documentDate: null, totalAmount: null, currency: null, supplierName: null,
				gstAmount: null, poNumber: null, dueDate: null,
				confidence: 0.1, confidenceBand: 'low', needsReview: true,
				validationWarnings: ['Image OCR returned very little text.'],
				sourceSnippets: {}, extractionMethod: 'external_ocr', ocrProvider: 'workers_ai',
				llmProvider: 'heuristic', promptVersion, rawText: imageText
			};
		}
		const imageExtracted = await extractStructuredDocumentFields(imageText, {
			llmProvider: 'external', promptVersion, env
		});
		const imgConfidence = imageExtracted.llmProvider !== 'heuristic' ? 0.75 : 0.45;
		return {
			documentDate: imageExtracted.documentDate, totalAmount: imageExtracted.totalAmount,
			currency: imageExtracted.currency, supplierName: imageExtracted.supplierName,
			gstAmount: imageExtracted.gstAmount, poNumber: imageExtracted.poNumber,
			dueDate: imageExtracted.dueDate,
			confidence: imgConfidence,
			confidenceBand: imgConfidence >= 0.75 ? 'high' : 'medium',
			needsReview: imgConfidence < 0.75,
			validationWarnings: [],
			sourceSnippets: {}, extractionMethod: 'external_ocr', ocrProvider: 'workers_ai',
			llmProvider: imageExtracted.llmProvider, promptVersion, rawText: imageText
		};
	}

	let rawText = '';
	let extractionMethod: OcrPipelineExtract['extractionMethod'];
	let ocrProvider: OcrPipelineExtract['ocrProvider'];

	if (isPdf) {
		rawText = '';
		extractionMethod = 'pdf_text';
		ocrProvider = 'builtin_pdf';
	} else if (isDocx) {
		rawText = extractDocxText(bytes);
		extractionMethod = 'docx_text';
		ocrProvider = 'docx_native';
	} else {
		rawText = '';
		extractionMethod = 'pdf_text';
		ocrProvider = 'builtin_pdf';
	}

	const validationWarnings: string[] = [];
	const textLen = rawText.trim().length;
	const hasGoodText = textLen > 100;

	if (!hasGoodText) {
		if (isPdf && !(opts?.rawTextOverride && opts.rawTextOverride.trim().length > 0)) {
			validationWarnings.push(
				'No trusted PDF text provided. Please extract text on client (pdfjs/OCR) and send rawText.'
			);
		} else {
			validationWarnings.push(
				'Extracted text is very short; this may be a scanned PDF without a text layer.'
			);
		}
		return {
			documentDate: null,
			totalAmount: null,
			currency: null,
			supplierName: null,
			gstAmount: null,
			poNumber: null,
			dueDate: null,
			confidence: 0.15,
			confidenceBand: 'low',
			needsReview: true,
			validationWarnings,
			sourceSnippets: {},
			extractionMethod,
			ocrProvider,
			llmProvider: 'heuristic',
			promptVersion,
			rawText
		};
	}

	const extracted = await extractStructuredDocumentFields(rawText, {
		llmProvider: 'external',
		promptVersion,
		env
	});

	const llmDidWork = extracted.llmProvider !== 'heuristic';
	const confidence = llmDidWork ? 0.85 : 0.55;
	const confidenceBand: OcrPipelineExtract['confidenceBand'] = confidence >= 0.75 ? 'high' : 'medium';

	return {
		documentDate: extracted.documentDate,
		totalAmount: extracted.totalAmount,
		currency: extracted.currency,
		supplierName: extracted.supplierName,
		gstAmount: extracted.gstAmount,
		poNumber: extracted.poNumber,
		dueDate: extracted.dueDate,
		confidence,
		confidenceBand,
		needsReview: confidence < 0.75,
		validationWarnings,
		sourceSnippets: {},
		extractionMethod,
		ocrProvider,
		llmProvider: extracted.llmProvider,
		promptVersion,
		rawText
	};
}
