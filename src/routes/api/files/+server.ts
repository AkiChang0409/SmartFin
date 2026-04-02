import type { RequestHandler } from './$types';

import { fail } from '$lib/server/http';

export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const key = url.searchParams.get('key');
	if (!key) {
		return fail('Missing key', 400);
	}

	const object = await platform.env.R2.get(key);
	if (!object) {
		return fail('File not found', 404);
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);

	return new Response(object.body, { headers });
};
