/**
 * Generic fallback extractor. Used when:
 *   • docType is 'other' (unclassifiable archive doc) — try to pull a
 *     date and amount if present, otherwise empty.
 *   • category is 'allowance' — there's no file at all, so nothing to
 *     extract. User fills manually in the ReviewStep form.
 *
 * No LLM call — cheap regex-only path, since we don't know the schema.
 */

import type { ExtractedFields } from '../types';

export function extractGeneric(rawText: string): Partial<ExtractedFields> {
	const r: Partial<ExtractedFields> = {};

	const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2})/);
	if (dateMatch?.[1]) r.documentDate = dateMatch[1];

	// Pick the largest-looking money-shaped number — the "total" is usually
	// the biggest value on a doc.
	const amountMatches = rawText.match(/[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})/g);
	if (amountMatches && amountMatches.length > 0) {
		const nums = amountMatches.map((s) => Number(s.replace(/,/g, ''))).filter(Number.isFinite);
		if (nums.length > 0) r.totalAmount = Math.max(...nums);
	}

	const curMatch = rawText.match(/\b(SGD|USD|CNY|MYR|EUR|S\$|US\$|RMB|RM)\b/i);
	if (curMatch?.[1]) {
		const up = curMatch[1].toUpperCase();
		const aliases: Record<string, string> = {
			S$: 'SGD',
			US$: 'USD',
			RMB: 'CNY',
			RM: 'MYR'
		};
		r.currency = aliases[up] ?? up;
	}

	return r;
}
