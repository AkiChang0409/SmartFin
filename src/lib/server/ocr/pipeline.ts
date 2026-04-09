import { extractStructuredInvoiceFields } from './llm-extract';
import { extractWithExternalOcr } from './ocr-api';
import { extractPdfText } from './pdf-extract';
import type { ExtractedInvoiceFields } from './types';

type RuntimeConfig = {
	ocrProvider: 'mock' | 'external';
	ocrApiUrl?: string;
	ocrApiKey?: string;
	llmProvider: 'heuristic' | 'external';
	llmApiUrl?: string;
	llmApiKey?: string;
	promptVersion: string;
};

function resolveRuntimeConfig(env?: Env): RuntimeConfig {
	const pe = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
	const pick = (k: keyof Env, fallback = ''): string =>
		((env?.[k] as string | undefined) ?? pe?.[k] ?? fallback).toString();

	return {
		ocrProvider: pick('OCR_PROVIDER', 'mock') === 'external' ? 'external' : 'mock',
		ocrApiUrl: pick('OCR_API_URL') || undefined,
		ocrApiKey: pick('OCR_API_KEY') || undefined,
		llmProvider: pick('LLM_PROVIDER', 'heuristic') === 'external' ? 'external' : 'heuristic',
		llmApiUrl: pick('LLM_API_URL') || undefined,
		llmApiKey: pick('LLM_API_KEY') || undefined,
		promptVersion: pick('OCR_PROMPT_VERSION', 'v1')
	};
}

function makeSourceSnippets(rawText: string): ExtractedInvoiceFields['sourceSnippets'] {
	return {
		invoiceDate: rawText.match(/invoice\s*date[:\s]+([^\n]+)/i)?.[0],
		dueDate: rawText.match(/due\s*date[:\s]+([^\n]+)/i)?.[0],
		totalAmount: rawText.match(/(?:total|amount\s*due)[:\s$]+([^\n]+)/i)?.[0],
		gstAmount: rawText.match(/(?:gst|tax)\s*(?:amount)?[:\s$]+([^\n]+)/i)?.[0],
		supplierName: rawText.match(/supplier[:\s]+([^\n]+)/i)?.[0],
		poNumber: rawText.match(/po(?:\s*number)?[:\s#-]+([^\n]+)/i)?.[0]
	};
}

function validateFields(fields: {
	invoiceDate: string | null;
	dueDate: string | null;
	totalAmount: number | null;
	gstAmount: number | null;
}): string[] {
	const warnings: string[] = [];
	if (fields.totalAmount === null) warnings.push('Missing total amount');
	if (fields.invoiceDate === null) warnings.push('Missing invoice date');
	if (fields.gstAmount !== null && fields.totalAmount !== null && fields.gstAmount > fields.totalAmount) {
		warnings.push('GST amount is greater than total amount');
	}
	if (fields.invoiceDate && fields.dueDate && fields.dueDate < fields.invoiceDate) {
		warnings.push('Due date is earlier than invoice date');
	}
	return warnings;
}

function confidenceBand(confidence: number): ExtractedInvoiceFields['confidenceBand'] {
	if (confidence >= 0.8) return 'high';
	if (confidence >= 0.6) return 'medium';
	return 'low';
}

export async function runOcrPipeline(
	fileType: string,
	data: ArrayBuffer,
	env?: Env
): Promise<ExtractedInvoiceFields> {
	const config = resolveRuntimeConfig(env);
	let text = '';
	let confidence = 0;
	let extractionMethod: ExtractedInvoiceFields['extractionMethod'] = 'pdf_text';
	let ocrProvider: ExtractedInvoiceFields['ocrProvider'] = 'builtin_pdf';

	if (fileType.includes('pdf')) {
		text = await extractPdfText(data);
		confidence = text.length > 0 ? 0.7 : 0.1;
		extractionMethod = 'pdf_text';
		ocrProvider = 'builtin_pdf';
	} else {
		const result = await extractWithExternalOcr(data, {
			ocrProvider: config.ocrProvider,
			ocrApiUrl: config.ocrApiUrl,
			ocrApiKey: config.ocrApiKey
		});
		text = result.text;
		confidence = result.confidence ?? 0.2;
		extractionMethod = 'external_ocr';
		ocrProvider = result.provider;
	}

	const structured = await extractStructuredInvoiceFields(text, {
		llmProvider: config.llmProvider,
		llmApiUrl: config.llmApiUrl,
		llmApiKey: config.llmApiKey,
		promptVersion: config.promptVersion,
		env
	});
	const warnings = validateFields({
		invoiceDate: structured.invoiceDate,
		dueDate: structured.dueDate,
		totalAmount: structured.totalAmount,
		gstAmount: structured.gstAmount
	});
	const penalty = warnings.length * 0.08;
	const finalConfidence = Math.max(0, Math.min(1, Math.max(confidence, 0.5) - penalty));

	return {
		invoiceDate: structured.invoiceDate,
		totalAmount: structured.totalAmount,
		currency: structured.currency,
		supplierName: structured.supplierName,
		gstAmount: structured.gstAmount,
		poNumber: structured.poNumber,
		dueDate: structured.dueDate,
		confidence: finalConfidence,
		confidenceBand: confidenceBand(finalConfidence),
		needsReview: finalConfidence < 0.8 || warnings.length > 0,
		validationWarnings: warnings,
		sourceSnippets: makeSourceSnippets(text),
		extractionMethod,
		ocrProvider,
		llmProvider: structured.llmProvider,
		promptVersion: config.promptVersion,
		rawText: text
	};
}
