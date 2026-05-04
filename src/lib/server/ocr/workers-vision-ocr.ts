import { CATEGORY_LABELS, CATEGORY_METADATA_FIELDS, type ExpenseCategory, type ExpenseDocType, type ExpenseType } from '$lib/constants/expense-upload';

export type WorkersVisionOcrResult =
	| { ok: true; text: string; model: string }
	| { ok: false; error: string };

export type WorkersVisionOcrGuidance = {
	expenseType?: ExpenseType;
	category?: ExpenseCategory;
	docType?: ExpenseDocType | null;
};

function readEnv(platformEnv: Env, key: string): string {
	const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
	const fromPlatform = (platformEnv as unknown as Record<string, unknown>)[key];
	if (typeof fromPlatform === 'string' && fromPlatform.trim()) return fromPlatform.trim();
	const fromProcess = processEnv?.[key];
	return typeof fromProcess === 'string' ? fromProcess.trim() : '';
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function uint8ToBase64(bytes: Uint8Array): string {
	const chunk = 8192;
	let binary = '';
	for (let i = 0; i < bytes.length; i += chunk) {
		const sub = bytes.subarray(i, i + chunk);
		for (let j = 0; j < sub.length; j += 1) {
			binary += String.fromCharCode(sub[j]!);
		}
	}
	return btoa(binary);
}

function normalizeMime(mime: string): string {
	const m = mime.toLowerCase().trim();
	if (m === 'image/jpg') return 'image/jpeg';
	if (m.startsWith('image/')) return m;
	return 'image/jpeg';
}

function extractVisionText(raw: unknown): string {
	if (raw === null || raw === undefined) return '';
	if (typeof raw === 'string') return raw;
	if (typeof raw !== 'object') return '';

	const o = raw as Record<string, unknown>;
	if (typeof o.response === 'string') return o.response;
	if (typeof o.result === 'string') return o.result;
	if (typeof o.output === 'string') return o.output;
	if (typeof o.output_text === 'string') return o.output_text;
	if (typeof o.text === 'string') return o.text;

	if (o.result && typeof o.result === 'object' && !Array.isArray(o.result)) {
		const r = o.result as Record<string, unknown>;
		if (typeof r.response === 'string') return r.response;
		if (typeof r.text === 'string') return r.text;
	}

	const choices = o.choices as Array<{ message?: { content?: unknown } }> | undefined;
	const content = choices?.[0]?.message?.content;
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) {
		return content
			.map((p) => (typeof p === 'object' && p && 'text' in p ? String((p as { text?: string }).text ?? '') : ''))
			.filter(Boolean)
			.join('\n');
	}

	return '';
}

const SYSTEM_PROMPT = `You are a strict OCR transcription engine for finance documents.
Task: transcribe printed text from the document image only.

Hard rules:
- Output plain text only (no markdown, no JSON, no explanations).
- Keep line breaks for distinct rows/lines.
- Include numbers, dates, currency symbols/codes, IDs, addresses, and table cells.
- DO NOT describe the scene, paper, hand, camera, background, lighting, or perspective.
- DO NOT summarize or infer. Only copy visible text.
- If unreadable, output exactly: [UNREADABLE]`;

const USER_PROMPT =
	'OCR only: copy every legible character from this document image. Do not add any visual description.';

const RETRY_USER_PROMPT =
	'Your previous answer looked like scene description. Retry with OCR-only transcript: output only text that appears on the document, line by line, no commentary.';

function looksLikeCaption(text: string): boolean {
	const t = text.toLowerCase();
	const phrases = [
		'partially visible',
		'displayed on',
		'resting on',
		'suggesting',
		'appears to be',
		'in the lower right corner',
		'a hand is',
		'the image shows'
	];
	if (phrases.some((p) => t.includes(p))) return true;
	const docTokens = (t.match(/\b(invoice|total|date|gst|tax|po|receipt|amount|due)\b/g) ?? []).length;
	return t.length > 100 && docTokens <= 1 && !/\d{2,}/.test(t);
}

function buildGuidancePrompt(guidance?: WorkersVisionOcrGuidance): string {
	if (!guidance?.category) return '';
	const defs = CATEGORY_METADATA_FIELDS[guidance.category] ?? [];
	const metaLabels = defs.map((d) => d.label).filter(Boolean);
	const baseFields = ['Amount / Total', 'Currency', 'Date', 'Vendor / Supplier', 'GST / Tax'];
	const focus = [...baseFields, ...metaLabels].slice(0, 14);
	if (focus.length === 0) return '';
	return `\nFocus fields for this upload context:
- expenseType: ${guidance.expenseType ?? 'unknown'}
- category: ${guidance.category} (${CATEGORY_LABELS[guidance.category] ?? guidance.category})
- docType: ${guidance.docType ?? 'none'}
- Pay extra attention to lines containing: ${focus.join(', ')}
Still return full verbatim transcription (not extracted JSON).`;
}

export async function runWorkersVisionOcr(
	env: Env,
	input: { imageBytes: Uint8Array; mimeType: string; guidance?: WorkersVisionOcrGuidance }
): Promise<WorkersVisionOcrResult> {
	if (!env.AI) {
		return { ok: false, error: 'Workers AI is not available (missing AI binding).' };
	}
	if (input.imageBytes.length === 0) {
		return { ok: false, error: 'Empty image payload.' };
	}
	if (input.imageBytes.length > MAX_IMAGE_BYTES) {
		return { ok: false, error: `Image too large (${input.imageBytes.length} bytes, max ${MAX_IMAGE_BYTES}).` };
	}

	const model = readEnv(env, 'WORKERS_AI_VISION_MODEL') || '@cf/meta/llama-3.2-11b-vision-instruct';
	const mime = normalizeMime(input.mimeType);
	const dataUri = `data:${mime};base64,${uint8ToBase64(input.imageBytes)}`;

	const makeMessages = (userPrompt: string) => [
		{ role: 'system' as const, content: SYSTEM_PROMPT },
		{
			role: 'user' as const,
			content: [
				{ type: 'text' as const, text: `${userPrompt}${buildGuidancePrompt(input.guidance)}` },
				{ type: 'image_url' as const, image_url: { url: dataUri } }
			]
		}
	];

	const runVision = async (userPrompt: string) =>
		env.AI!.run(model as Parameters<NonNullable<Env['AI']>['run']>[0], {
			messages: makeMessages(userPrompt),
			max_tokens: 2048,
			temperature: 0
		} as Parameters<NonNullable<Env['AI']>['run']>[1]);

	try {
		let raw: unknown;
		try {
			raw = await runVision(USER_PROMPT);
		} catch {
			// Llama 3.2 Vision requires a one-time Meta license acknowledgement
			try {
				await env.AI!.run(model as Parameters<NonNullable<Env['AI']>['run']>[0], {
					prompt: 'agree'
				} as Parameters<NonNullable<Env['AI']>['run']>[1]);
			} catch { /* already agreed or unrelated */ }
			raw = await runVision(USER_PROMPT);
		}

		let text = extractVisionText(raw).trim();
		if (text && text !== '[UNREADABLE]' && looksLikeCaption(text)) {
			const retryRaw = await runVision(RETRY_USER_PROMPT);
			const retryText = extractVisionText(retryRaw).trim();
			if (retryText && retryText !== '[UNREADABLE]' && !looksLikeCaption(retryText)) {
				text = retryText;
			}
		}
		if (!text || text === '[UNREADABLE]') {
			return { ok: false, error: 'Vision model returned no usable text.' };
		}
		return { ok: true, text, model };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Workers AI vision call failed.' };
	}
}
