import type { PageServerLoad } from './$types';

type ApiResult<T> = {
	ok: boolean;
	data: T;
	error?: string;
};

export const load: PageServerLoad = async ({ fetch }) => {
	const [overviewRes, rankingRes] = await Promise.all([
		fetch('/api/dashboard/overview'),
		fetch('/api/dashboard/projects-profit')
	]);

	const overviewJson = (await overviewRes.json()) as ApiResult<{
		revenue: number;
		expense: number;
		netProfit: number;
		pendingReceivable: number;
		pendingPayable: number;
	}>;
	const rankingJson = (await rankingRes.json()) as ApiResult<
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
		overview: overviewJson.ok
			? overviewJson.data
			: { revenue: 0, expense: 0, netProfit: 0, pendingReceivable: 0, pendingPayable: 0 },
		projectRanking: rankingJson.ok ? rankingJson.data : []
	};
};
