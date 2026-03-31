import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type ApiResult<T> = {
	ok: boolean;
	data: T;
	error?: string;
};

export const load: PageServerLoad = async ({ fetch, params }) => {
	const response = await fetch(`/api/tax/gst/${params.year}/${params.quarter}/box/${params.n}`);
	const json = (await response.json()) as ApiResult<{
		box: number;
		invoices?: Array<Record<string, unknown>>;
		breakdown?: { box6: number; box7: number; net: number };
	}>;

	if (!json.ok) {
		error(400, json.error ?? 'Failed to load GST box details');
	}

	return {
		year: params.year,
		quarter: params.quarter,
		box: json.data.box,
		invoices: json.data.invoices ?? [],
		breakdown: json.data.breakdown ?? null
	};
};
