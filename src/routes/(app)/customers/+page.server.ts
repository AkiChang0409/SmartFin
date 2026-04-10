import { desc, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform) {
		return { customers: [] as { id: string; name: string; contact: string | null; address: string | null }[] };
	}

	const db = getDb(platform.env);
	const rows = await db
		.select({
			id: schema.customers.id,
			name: schema.customers.name,
			contact: schema.customers.contact,
			address: schema.customers.address
		})
		.from(schema.customers)
		.where(isNull(schema.customers.deletedAt))
		.orderBy(desc(schema.customers.createdAt));

	return { customers: rows };
};
