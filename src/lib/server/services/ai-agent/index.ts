type JsonLike = Record<string, unknown> | unknown[];

type AiJsonCallInput = {
	system: string;
	user: string;
	promptVersion?: string;
};

function readEnv(platformEnv: Env, key: string): string {
	const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
	const fromPlatform = (platformEnv as unknown as Record<string, unknown>)[key];
	if (typeof fromPlatform === 'string' && fromPlatform.trim()) return fromPlatform.trim();
	const fromProcess = processEnv?.[key];
	return typeof fromProcess === 'string' ? fromProcess.trim() : '';
}

function tryParseJson(raw: string): unknown | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return null;
	}
}

function pickJsonFromUnknown(input: unknown): unknown | null {
	if (input === null || input === undefined) return null;
	if (typeof input === 'string') return tryParseJson(input);
	if (Array.isArray(input)) return input;
	if (typeof input === 'object') {
		const obj = input as Record<string, unknown>;
		if (typeof obj.response === 'string') {
			const parsed = tryParseJson(obj.response);
			if (parsed !== null) return parsed;
		}
		if (typeof obj.output_text === 'string') {
			const parsed = tryParseJson(obj.output_text);
			if (parsed !== null) return parsed;
		}
		if (Array.isArray(obj.result)) return obj.result;
		return obj;
	}
	return null;
}

async function callWorkersAiJson(env: Env, input: AiJsonCallInput): Promise<unknown> {
	if (!env.AI) return null;
	const model = readEnv(env, 'WORKERS_AI_MODEL') || '@cf/meta/llama-3.1-8b-instruct';
	const modelKey = model as Parameters<NonNullable<Env['AI']>['run']>[0];
	const systemFull = input.promptVersion
		? `${input.system}\nPrompt version: ${input.promptVersion}`
		: input.system;

	try {
		const raw = await env.AI.run(modelKey, {
			messages: [
				{ role: 'system', content: systemFull },
				{ role: 'user', content: input.user }
			]
		});
		return pickJsonFromUnknown(raw);
	} catch {
		return null;
	}
}

async function callExternalApiJson(env: Env, input: AiJsonCallInput): Promise<unknown> {
	const provider = readEnv(env, 'LLM_PROVIDER').toLowerCase();
	const apiUrl = readEnv(env, 'LLM_API_URL');
	const apiKey = readEnv(env, 'LLM_API_KEY');
	if (provider !== 'external' || !apiUrl) return null;

	const promptVersion = input.promptVersion || readEnv(env, 'OCR_PROMPT_VERSION') || 'v1';
	const systemFull = `${input.system}\nPrompt version: ${promptVersion}`;
	const openAiModel = readEnv(env, 'OPENAI_MODEL') || 'gpt-4o-mini';
	const isOpenAiChatEndpoint = /api\.openai\.com\/v1\/chat\/completions/i.test(apiUrl);

	const response = await fetch(
		apiUrl,
		isOpenAiChatEndpoint
			? {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
					},
					body: JSON.stringify({
						model: openAiModel,
						temperature: 0,
						response_format: { type: 'json_object' },
						messages: [
							{ role: 'system', content: systemFull },
							{ role: 'user', content: input.user }
						]
					})
				}
			: {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
					},
					body: JSON.stringify({
						promptVersion,
						system: systemFull,
						input: input.user
					})
				}
	);
	if (!response.ok) return null;

	const raw = await response.text();
	try {
		const json = JSON.parse(raw) as Record<string, unknown>;
		if (isOpenAiChatEndpoint) {
			const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
			const content = choices?.[0]?.message?.content;
			return typeof content === 'string' ? tryParseJson(content) : null;
		}
		return json;
	} catch {
		return null;
	}
}

export async function callAiJson(env: Env, input: AiJsonCallInput): Promise<unknown> {
	const fromWorkersAi = await callWorkersAiJson(env, input);
	if (fromWorkersAi !== null) return fromWorkersAi;
	return callExternalApiJson(env, input);
}

export function isJsonLike(value: unknown): value is JsonLike {
	if (Array.isArray(value)) return true;
	return value !== null && typeof value === 'object';
}
