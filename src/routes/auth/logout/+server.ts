import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { writeAuditLog } from '$lib/server/audit';
import { clearSessionCookie } from '$lib/server/auth/session';

export const POST: RequestHandler = async ({ cookies, platform, locals }) => {
	await writeAuditLog(platform, locals.user, {
		action: 'auth.logout',
		entityType: 'user',
		entityId: locals.user?.id ?? null
	});
	await clearSessionCookie(cookies);
	throw redirect(303, '/login');
};
