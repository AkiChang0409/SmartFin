import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';

export const actions: Actions = {
	default: async ({ request, platform }) => {
		if (!platform) {
			return fail(500, { message: 'Cloudflare platform bindings are required' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const address = String(form.get('address') ?? '').trim();
		const contact = String(form.get('contact') ?? '').trim();
		const gstRegNo = String(form.get('gstRegNo') ?? '').trim();

		if (!name) {
			return fail(400, { message: 'Customer name is required.' });
		}

		const id = crypto.randomUUID();
		const db = getDb(platform.env);
		await db.insert(schema.customers).values({
			id,
			name,
			address: address || null,
			contact: contact || null,
			gstRegNo: gstRegNo || null,
			metadata: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});

		throw redirect(303, '/customers');
	}
};
