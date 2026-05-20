import type { PageServerLoad } from './$types';
import type { DocumentArtifactView } from '$modules/document-intake';

interface DocHubLibraryResponse {
	items: DocumentArtifactView[];
	total: number;
	limit: number;
	offset: number;
	page: number;
	pageSize: number;
	totalPages: number;
	filters: {
		q: string;
		status: string;
		documentType: string;
		source: string;
		categoryId: string;
		from: string;
		to: string;
	};
}

export const load: PageServerLoad = async (event) => {
	const params = new URLSearchParams(event.url.searchParams);
	params.set('page', String(Math.max(Number(params.get('page') ?? '1') || 1, 1)));

	const res = await event.fetch(`/api/documents/library?${params.toString()}`, {
		headers: { accept: 'application/json' }
	});

	if (!res.ok) {
		return {
			library: null,
			error: `Document library API returned ${res.status}`
		};
	}

	const json = (await res.json()) as { data?: DocHubLibraryResponse } | DocHubLibraryResponse;
	const library = 'data' in json && json.data ? json.data : (json as DocHubLibraryResponse);
	return { library, error: null };
};
