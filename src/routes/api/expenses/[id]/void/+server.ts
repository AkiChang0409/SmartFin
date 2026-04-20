import type { RequestHandler } from './$types';
import { fail } from '$lib/server/http';

/** @deprecated Removed per design: "录入即发生", no draft/confirmed/void status flow. */
export const POST: RequestHandler = async () => {
	return fail('This endpoint has been removed. Expenses are recorded as-is, no status workflow.', 410);
};
