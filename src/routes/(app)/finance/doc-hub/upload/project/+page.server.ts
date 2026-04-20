import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => {
	const initialDocType = url.searchParams.get('docType')?.trim() || 'contract';
	return {
		platformReady: !!platform,
		initialDocType
	};
};
