import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** @deprecated Use `/finance/contracts` */
export const load: PageServerLoad = async ({ url }) => {
	throw redirect(308, `/finance/contracts${url.search}`);
};
