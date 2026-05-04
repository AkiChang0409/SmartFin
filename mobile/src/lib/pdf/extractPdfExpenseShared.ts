/** 与网页 `expenses/upload` 的视觉兜底阈值对齐 */
export const PDF_TEXT_MIN_CHARS = 48;

export const PDF_VISION_MAX_PAGES = 8;

export function isLikelyPdfMimeOrName(mime: string, fileName: string): boolean {
	const m = mime.toLowerCase();
	const n = fileName.toLowerCase();
	return m === 'application/pdf' || n.endsWith('.pdf');
}

export function normalizeFileUri(raw: string): string {
	const t = raw.trim();
	if (t.startsWith('file://')) return t;
	return `file://${t.startsWith('/') ? '' : '/'}${t}`;
}

export type WorkersVisionFn = (
	args: {
		fileName: string;
		mime: string;
	} & ({ uri: string } | { blob: Blob })
) => Promise<{ text?: string }>;
