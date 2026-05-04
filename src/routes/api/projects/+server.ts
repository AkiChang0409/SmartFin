import type { RequestHandler } from './$types';

import { createModuleContext } from '$lib/server/modules';
import { createProjectApi } from '$lib/server/modules/project/api';
import { fail, ok } from '$lib/server/http';

export const GET: RequestHandler = async (event) => {
	try {
		const ctx = await createModuleContext(event);
		const project = createProjectApi(ctx);

		const q = event.url.searchParams.get('q') ?? undefined;
		const status = event.url.searchParams.get('status') ?? undefined;
		const rawPs = event.url.searchParams.get('pageSize');
		let pageSize: number | undefined;
		if (rawPs) {
			const n = Number.parseInt(rawPs, 10);
			if (Number.isFinite(n)) pageSize = Math.min(200, Math.max(1, n));
		}

		const rows = await project.list({ q, status, pageSize });

		/** 扁平列表，供移动端等客户端稳定解析（避免嵌套 `project` 序列化差异）。 */
		const simple = event.url.searchParams.get('format') === 'simple';
		if (simple) {
			const simplified = rows.map((row) => ({
				id: row.project.id,
				name: row.customerName?.trim()
					? `${row.project.name} · ${row.customerName.trim()}`
					: row.project.name,
				status: row.project.status
			}));
			return ok(simplified);
		}

		return ok(rows);
	} catch (e) {
		return fail((e as Error).message, 500);
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		const ctx = await createModuleContext(event);
		const project = createProjectApi(ctx);

		const body = (await event.request.json()) as {
			customerId?: string;
			name?: string;
			status?: string;
			description?: string;
			startDate?: string;
			endDate?: string;
		};

		if (!body.customerId || !body.name) {
			return fail('Missing required fields: customerId, name');
		}

		const result = await project.create({
			customerId: body.customerId,
			name: body.name,
			status: body.status,
			description: body.description,
			startDate: body.startDate,
			endDate: body.endDate
		});

		return ok({ id: result.id }, 201);
	} catch (e) {
		return fail((e as Error).message, 500);
	}
};
