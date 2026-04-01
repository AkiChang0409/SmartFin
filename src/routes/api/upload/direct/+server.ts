import type { RequestHandler } from './$types';

import { fail, ok } from '$lib/server/http';

export const POST: RequestHandler = async ({ request, url, platform }) => {
	if (!platform) {
		return fail('Cloudflare platform bindings are required', 500);
	}

	const key = url.searchParams.get('key') ?? '';
	if (!key) {
		return fail('Missing required query param: key');
	}

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		return fail('Missing required form field: file');
	}

	await platform.env.R2.put(key, await file.arrayBuffer(), {
		httpMetadata: {
			contentType: file.type || 'application/octet-stream'
		}
	});

	return ok(
		{
			key,
			fileName: file.name,
			contentType: file.type || 'application/octet-stream',
			size: file.size
		},
		201
	);
};
