import { asc, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

import { getDb, schema } from '$lib/server/modules/legacy-db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform) {
		return { employees: [] };
	}

	const db = getDb(platform.env);
	let employees: Array<{ id: string; name: string }> = [];

	try {
		employees = await db
			.select({
				id: schema.employees.id,
				name: schema.employees.name
			})
			.from(schema.employees)
			.where(isNull(schema.employees.deletedAt))
			.orderBy(asc(schema.employees.name));
	} catch (error) {
		console.error('[expenses/upload] failed to load employees:', error);
	}

	return { employees };
};
