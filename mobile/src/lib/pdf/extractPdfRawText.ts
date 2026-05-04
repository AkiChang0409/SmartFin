/**
 * 供 TypeScript 解析；Metro 运行时优先加载 `extractPdfRawText.native.ts` /
 * `extractPdfRawText.web.ts`。
 */
export {
	buildPdfRawTextForDetect,
	extractPdfTextFromBytes,
	isLikelyPdfMimeOrName,
	PDF_TEXT_MIN_CHARS
} from './extractPdfRawText.native';
