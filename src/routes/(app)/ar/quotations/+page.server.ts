import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** @deprecated Use `/finance/quotations` */
export const load: PageServerLoad = async ({ url }) => {
	throw redirect(308, `/finance/quotations${url.search}`);
};
