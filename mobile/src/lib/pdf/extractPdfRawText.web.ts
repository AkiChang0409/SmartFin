import './registerPdfWorker';
import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';

import {
	isLikelyPdfMimeOrName,
	PDF_TEXT_MIN_CHARS,
	type WorkersVisionFn
} from './extractPdfExpenseShared';

export { isLikelyPdfMimeOrName, PDF_TEXT_MIN_CHARS } from './extractPdfExpenseShared';

const MAX_PAGES = 8;
const PDF_PARSE_TIMEOUT_MS = 15_000;

/** Expo Web：`expo-document-picker` 等场景下不可用 PdfRenderer → 仅用 pdfjs canvas。其它浏览器逻辑亦走此处。 */

async function renderPdfFirstPageBlobWeb(fileBytes: Uint8Array): Promise<Blob | null> {
	if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') return null;
	try {
		const pdf = await getDocument({
			data: fileBytes.slice(),
			verbosity: VerbosityLevel.ERRORS
		}).promise;
		if (pdf.numPages < 1) return null;
		const page = await pdf.getPage(1);
		const baseVp = page.getViewport({ scale: 1 });
		const viewport = page.getViewport({
			scale: Math.min(2.5, 1600 / Math.max(baseVp.width, 1))
		});
		const canvas = document.createElement('canvas');
		canvas.width = Math.ceil(viewport.width);
		canvas.height = Math.ceil(viewport.height);
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		await page.render({ canvasContext: ctx, viewport, canvas }).promise;
		return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88));
	} catch {
		return null;
	}
}

export async function extractPdfTextFromBytes(bytes: ArrayBuffer): Promise<string> {
	const data = new Uint8Array(bytes);
	const pdf = await Promise.race([
		getDocument({ data, verbosity: VerbosityLevel.ERRORS }).promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('PDF parse timeout')), PDF_PARSE_TIMEOUT_MS)
		)
	]);
	const limit = Math.min(pdf.numPages, MAX_PAGES);
	const chunks: string[] = [];
	for (let i = 1; i <= limit; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const line = content.items
			.map((item) =>
				'str' in item && typeof (item as { str: string }).str === 'string'
					? (item as { str: string }).str
					: ''
			)
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
		if (line) chunks.push(line);
	}
	return chunks.join('\n').trim();
}

export async function buildPdfRawTextForDetect(opts: {
	uri: string;
	fileName: string;
	mime: string;
	runWorkersVision: WorkersVisionFn;
}): Promise<string> {
	const { uri, fileName, mime, runWorkersVision } = opts;
	if (!isLikelyPdfMimeOrName(mime, fileName)) return '';

	let buf: ArrayBuffer;
	try {
		const res = await fetch(uri);
		if (!res.ok) return '';
		buf = await res.arrayBuffer();
	} catch {
		return '';
	}

	let text = '';
	try {
		text = await extractPdfTextFromBytes(buf);
	} catch {
		text = '';
	}

	const trimmed = text.trim();
	const baseStem = fileName.replace(/\.pdf$/i, '') || 'document';

	if (trimmed.length >= PDF_TEXT_MIN_CHARS) return trimmed;

	try {
		const jpeg = await renderPdfFirstPageBlobWeb(new Uint8Array(buf));
		if (jpeg) {
			const ocrText = (
				await runWorkersVision({
					blob: jpeg,
					fileName: `${baseStem}-p1.jpg`,
					mime: 'image/jpeg'
				})
			).text?.trim();
			if (ocrText) return ocrText;
		}
	} catch {
		/* ignore */
	}

	return trimmed;
}
