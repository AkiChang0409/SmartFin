// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Env {
		DB: D1Database;
		R2: R2Bucket;
		KV: KVNamespace;
		OCR_QUEUE: Queue;
		AI?: Ai;
		OCR_PROVIDER?: 'mock' | 'external';
		OCR_API_URL?: string;
		OCR_API_KEY?: string;
		LLM_PROVIDER?: 'heuristic' | 'external';
		LLM_API_URL?: string;
		LLM_API_KEY?: string;
		OCR_PROMPT_VERSION?: string;
		BETTER_AUTH_SECRET?: string;
		BETTER_AUTH_URL?: string;
	}

	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties
		}

		// interface Error {}
		interface Locals {
			user: {
				id: string;
				email: string;
				role: 'owner' | 'finance' | 'project_manager' | 'employee';
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
