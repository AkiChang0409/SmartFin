import type { PageServerLoad } from './$types';

type ApiResult<T> = {
	ok: boolean;
	data: T;
	error?: string;
};

export const load: PageServerLoad = async ({ fetch, url }) => {
	const projectStatus = url.searchParams.get('status') ?? '';
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const overviewQs = new URLSearchParams();
	const rankingQs = new URLSearchParams();
	if (projectStatus) rankingQs.set('projectStatus', projectStatus);
	if (from) {
		overviewQs.set('from', from);
		rankingQs.set('from', from);
	}
	if (to) {
		overviewQs.set('to', to);
		rankingQs.set('to', to);
	}
	const [overviewRes, rankingRes] = await Promise.all([
		fetch(`/api/dashboard/overview?${overviewQs.toString()}`),
		fetch(`/api/dashboard/projects-profit?${rankingQs.toString()}`)
	]);

	const overviewJson = (await overviewRes.json()) as ApiResult<{
		revenue: number;
		expense: number;
		netProfit: number;
		pendingReceivable: number;
		pendingPayable: number;
		range: { start: string; end: string };
		previousRange: { start: string; end: string };
		trend: {
			revenueDelta: number;
			expenseDelta: number;
			netProfitDelta: number;
		};
		details: {
			revenueItems: Array<{
				id: string;
				date: string;
				ref: string;
				note: string;
				amount: number;
			}>;
			expenseItems: Array<{
				id: string;
				source: string;
				date: string;
				ref: string;
				note: string;
				amount: number;
			}>;
		};
	}>;
	const rankingJson = (await rankingRes.json()) as ApiResult<
		Array<{
			projectId: string;
			projectName: string;
			projectStatus: string;
			revenue: number;
			cost: number;
			profit: number;
			profitMargin: number;
		}>
	>;

	return {
		overview: overviewJson.ok
			? overviewJson.data
			: {
					revenue: 0,
					expense: 0,
					netProfit: 0,
					pendingReceivable: 0,
					pendingPayable: 0,
					range: { start: '', end: '' },
					previousRange: { start: '', end: '' },
					trend: { revenueDelta: 0, expenseDelta: 0, netProfitDelta: 0 },
					details: { revenueItems: [], expenseItems: [] }
				},
		projectRanking: rankingJson.ok ? rankingJson.data : [],
		filters: { status: projectStatus, from, to }
	};
};
