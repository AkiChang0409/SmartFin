import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** @deprecated Use `/finance/supplier-invoices` */
export const load: PageServerLoad = async ({ url }) => {
	throw redirect(308, `/finance/supplier-invoices${url.search}`);
};
