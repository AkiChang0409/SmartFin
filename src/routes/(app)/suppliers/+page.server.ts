import type { PageServerLoad } from './$types';

import { createBusinessPartnerApi } from '$lib/server/modules/business-partner/api';
import { createModuleContext } from '$lib/server/modules';

export const load: PageServerLoad = async (event) => {
	if (!event.platform) {
		return { suppliers: [] as { id: string; name: string; contact: string | null; address: string | null }[] };
	}

	const ctx = await createModuleContext(event);
	const bp = createBusinessPartnerApi(ctx);
	const rows = await bp.listSuppliers();
	const suppliers = [...rows].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);

	return {
		suppliers: suppliers.map((s) => ({
			id: s.id,
			name: s.name,
			contact: s.contact ?? null,
			address: s.address ?? null
		}))
	};
};
