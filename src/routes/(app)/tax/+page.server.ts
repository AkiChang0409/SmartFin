import type { PageServerLoad } from './$types';

type ApiResult<T> = {
	ok: boolean;
	data: T;
	error?: string;
};

function getDefaultQuarter() {
	const now = new Date();
	const year = now.getUTCFullYear();
	const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
	return { year, quarter };
}

export const load: PageServerLoad = async ({ fetch, url }) => {
	const fallback = getDefaultQuarter();
	const year = Number.parseInt(url.searchParams.get('year') ?? `${fallback.year}`, 10);
	const quarter = Number.parseInt(url.searchParams.get('quarter') ?? `${fallback.quarter}`, 10);

	const response = await fetch(`/api/tax/gst/${year}/${quarter}`);
	const json = (await response.json()) as ApiResult<{
		year: string;
		quarter: string;
		range: { start: string; end: string };
		boxes: Record<string, number>;
	}>;

	return {
		year,
		quarter,
		gst: json.ok
			? json.data
			: {
					year: `${year}`,
					quarter: `${quarter}`,
					range: { start: '', end: '' },
					boxes: {
						box1: 0,
						box2: 0,
						box3: 0,
						box4: 0,
						box5: 0,
						box6: 0,
						box7: 0,
						box8: 0,
						box9: 0,
						box10: 0,
						box11: 0,
						box12: 0,
						box13: 0
					}
				}
	};
};
