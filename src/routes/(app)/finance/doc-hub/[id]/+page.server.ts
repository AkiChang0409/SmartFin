import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { DocumentArtifactView } from '$modules/document-intake';

export const load: PageServerLoad = async (event) => {
	const id = event.params.id;
	if (!id) throw error(400, 'Missing document id');

	const res = await event.fetch(`/api/documents/${encodeURIComponent(id)}`, {
		headers: { accept: 'application/json' }
	});
	if (res.status === 404) throw error(404, 'Document not found');
	if (!res.ok) throw error(res.status, 'Could not load document artifact');

	const json = (await res.json()) as { data?: DocumentArtifactView } | DocumentArtifactView;
	const artifact = 'data' in json && json.data ? json.data : (json as DocumentArtifactView);
	if (!artifact) throw error(500, 'Empty response from documents API');

	return {
		artifact,
		fileViewUrl: `/api/documents/${encodeURIComponent(artifact.id)}/file`,
		fileDownloadUrl: `/api/documents/${encodeURIComponent(artifact.id)}/file?download=1`
	};
};
