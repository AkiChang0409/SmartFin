import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Legacy URL — canonical route is `/projects/[id]/documents/contracts/[contractId]`. */
export const load: PageServerLoad = async ({ params, url }) => {
	throw redirect(
		308,
		`/projects/${encodeURIComponent(params.id)}/documents/contracts/${encodeURIComponent(params.contractId)}${url.search}`
	);
};
