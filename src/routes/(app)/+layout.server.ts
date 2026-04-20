import { and, eq, isNull, sql } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { getEnabledModuleIds } from '$lib/server/modules/enabled';

function shouldLoadProjectSidebarCounts(pathname: string): boolean {
	if (!pathname.startsWith('/projects')) return false;
	// Matches +layout.svelte isProjectDetailPage: no shell sidebar or list counts on detail routes
	return !/^\/projects\/(?!new$)[^/]+/.test(pathname);
}

export const load: LayoutServerLoad = async ({ locals, platform, url }) => {
	let enabledModules: string[] = [];
	let projectListCounts: { all: number; active: number } | undefined;

	if (platform) {
		const db = getDb(platform.env);
		enabledModules = await getEnabledModuleIds(db);
		if (shouldLoadProjectSidebarCounts(url.pathname)) {
			const [[allProjectsCountRow], [activeProjectsCountRow]] = await Promise.all([
				db.select({ n: sql<number>`count(*)` }).from(schema.projects).where(isNull(schema.projects.deletedAt)),
				db
					.select({ n: sql<number>`count(*)` })
					.from(schema.projects)
					.where(and(isNull(schema.projects.deletedAt), eq(schema.projects.status, 'active')))
			]);
			projectListCounts = {
				all: Number(allProjectsCountRow?.n ?? 0),
				active: Number(activeProjectsCountRow?.n ?? 0)
			};
		}
	}
	return {
		user: locals.user,
		enabledModules,
		projectListCounts
	};
};
