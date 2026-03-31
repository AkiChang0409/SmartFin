import type { PageServerLoad } from './$types';

type ApiResult<T> = {
	ok: boolean;
	data: T;
	error?: string;
};

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch('/api/dashboard/projects-profit');
	const json = (await response.json()) as ApiResult<
		Array<{
			projectId: string;
			projectName: string;
			revenue: number;
			cost: number;
			profit: number;
			profitMargin: number;
		}>
	>;

	return {
		projectsProfit: json.ok ? json.data : []
	};
};
