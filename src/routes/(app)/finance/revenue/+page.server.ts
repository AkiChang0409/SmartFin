import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

import { createFinanceApi } from '$modules/finance';
import { createModuleContext } from '$platform/modules';

export const load: PageServerLoad = async (event) => {
	if (!event.platform) {
		return {
			revenueRecords: [],
			totals: { total: 0, standardRated: 0, zeroRate: 0 }
		};
	}

	const ctx = await createModuleContext(event);
	return createFinanceApi(ctx).revenue.getRevenueListPage();
};

export const actions: Actions = {
	create: async (event) => {
		const { request, platform } = event;
		if (!platform) return fail(500, { error: 'Platform not available' });

		const formData = await request.formData();
		const now = new Date().toISOString();

		const invoiceType = String(formData.get('invoiceType') || 'standard');
		const invoiceNumber = String(formData.get('invoiceNumber') || '') || null;
		const clientName = String(formData.get('clientName') || '') || null;
		const date = String(formData.get('date') || now.slice(0, 10));
		const amount = Number(formData.get('amount') || 0);
		const currency = String(formData.get('currency') || 'SGD').trim().toUpperCase();
		const gstAmount = Number(formData.get('gstAmount') || 0);
		const notes = String(formData.get('notes') || '') || null;

		const ctx = await createModuleContext(event);
		await createFinanceApi(ctx).revenue.createRevenue({
			invoiceType: invoiceType as 'standard' | 'zero_rate' | 'tax_invoice',
			invoiceNumber,
			clientName,
			projectId: null,
			date,
			amount,
			currency,
			gstAmount,
			notes
		});

		return { success: true };
	}
};
