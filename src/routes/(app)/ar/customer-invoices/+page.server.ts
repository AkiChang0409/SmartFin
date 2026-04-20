import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** @deprecated Use `/finance/customer-invoices` */
export const load: PageServerLoad = async ({ url }) => {
	throw redirect(308, `/finance/customer-invoices${url.search}`);
};
