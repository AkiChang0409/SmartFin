import type { RequestEvent } from '@sveltejs/kit';

/**
 * Cloudflare `vars` may omit BETTER_AUTH_SECRET (use Worker secrets / `.dev.vars` locally).
 * For local wrangler dev, `wrangler.jsonc` may still point BETTER_AUTH_URL at production — we
 * align auth base URL with the incoming request origin on localhost so cookies / CSRF match.
 */
export function resolveWorkerAuthEnv(event: RequestEvent): Env | null {
	const p = event.platform?.env;
	if (!p) return null;

	const secret = p.BETTER_AUTH_SECRET;
	if (!secret || typeof secret !== 'string') {
		return null;
	}

	const origin = event.url.origin;
	const isLocalHost =
		origin.includes('127.0.0.1') ||
		origin.includes('localhost') ||
		/^https?:\/\/\[::1\]/.test(origin);

	const configured = p.BETTER_AUTH_URL?.replace(/\/$/, '') ?? '';
	const baseURL = isLocalHost ? origin.replace(/\/$/, '') : configured || origin.replace(/\/$/, '');

	if (!baseURL) {
		return null;
	}

	return { ...p, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: baseURL };
}
