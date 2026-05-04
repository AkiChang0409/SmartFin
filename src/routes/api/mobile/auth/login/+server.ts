import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

import { resolveWorkerAuthEnv } from '$lib/server/auth/resolve-worker-env';
import { signSmartfinAccessToken, verifyEmailPasswordForJwt } from '$lib/server/auth/jwt-session';

const bodySchema = z.object({
	email: z.string().min(1),
	password: z.string().min(1)
});

export const POST: RequestHandler = async (event) => {
	const { request, platform } = event;
	if (!platform?.env) {
		return json({ ok: false, error: 'Cloudflare platform bindings are required' }, { status: 500 });
	}

	const env = resolveWorkerAuthEnv(event);

	if (!env) {
		return json({ ok: false, error: 'Auth environment is not configured (BETTER_AUTH_SECRET)' }, { status: 500 });
	}

	let body: z.infer<typeof bodySchema>;
	try {
		const raw = await request.json();
		body = bodySchema.parse(raw);
	} catch {
		return json({ ok: false, error: 'Invalid body' }, { status: 400 });
	}

	const user = await verifyEmailPasswordForJwt(env, body.email, body.password);
	if (!user) {
		return json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
	}

	const { token, expiresIn } = await signSmartfinAccessToken(env, user);

	return json({
		ok: true,
		accessToken: token,
		expiresIn,
		user: { id: user.id, email: user.email, role: user.role }
	});
};
