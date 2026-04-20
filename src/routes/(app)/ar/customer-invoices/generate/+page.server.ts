import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** @deprecated Use `/finance/customer-invoices/generate` */
export const load: PageServerLoad = async ({ url }) => {
	throw redirect(308, `/finance/customer-invoices/generate${url.search}`);
};
