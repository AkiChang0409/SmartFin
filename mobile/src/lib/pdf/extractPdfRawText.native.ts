/**
 * Hermes/Android/iOS：**不要引入 pdfjs-dist**（会触发 RN 环境与 Node DOM 假定相关崩溃）。
 * 与网页「字层 + 兜底」等价策略：PdfRenderer/PDFKit 光栅为多页 JPEG，再以 Workers Vision 抽字（至多 8 页）。
 */
import ExpoPdfToImageModule from 'expo-pdf-to-image';

import {
	isLikelyPdfMimeOrName,
	normalizeFileUri,
	PDF_TEXT_MIN_CHARS,
	PDF_VISION_MAX_PAGES,
	type WorkersVisionFn
} from './extractPdfExpenseShared';

export { isLikelyPdfMimeOrName, PDF_TEXT_MIN_CHARS } from './extractPdfExpenseShared';

/** 占位：原生不向库外暴露二进制解析路径 */
export async function extractPdfTextFromBytes(_bytes: ArrayBuffer): Promise<string> {
	return '';
}

/** 近似「满 8 页字层信息量」的早期停：Vision 为多页 OCR，累计足够则不再调用 API */
const VISION_EARLY_EXIT_CHARS = 3800;

export async function buildPdfRawTextForDetect(opts: {
	uri: string;
	fileName: string;
	mime: string;
	runWorkersVision: WorkersVisionFn;
}): Promise<string> {
	const { uri, fileName, mime, runWorkersVision } = opts;
	if (!isLikelyPdfMimeOrName(mime, fileName)) return '';

	const baseStem = fileName.replace(/\.pdf$/i, '') || 'document';
	const chunks: string[] = [];

	try {
		const pdfPath = normalizeFileUri(uri);
		const jpegPaths = await ExpoPdfToImageModule.convertPdfToImages(pdfPath);
		const limit = Math.min(jpegPaths.length, PDF_VISION_MAX_PAGES);

		for (let i = 0; i < limit; i++) {
			const imgUri = normalizeFileUri(jpegPaths[i]);
			let ocrLine = '';
			try {
				const vis = await runWorkersVision({
					uri: imgUri,
					fileName: `${baseStem}-p${i + 1}.jpg`,
					mime: 'image/jpeg'
				});
				ocrLine = vis.text?.trim() ?? '';
			} catch {
				continue;
			}
			if (ocrLine) chunks.push(ocrLine);

			const joined = chunks.join('\n').trim();
			if (joined.length >= VISION_EARLY_EXIT_CHARS || joined.length >= PDF_TEXT_MIN_CHARS * 80) break;
		}
		return chunks.join('\n').trim();
	} catch {
		return '';
	}
}
