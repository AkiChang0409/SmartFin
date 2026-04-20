import { and, eq, inArray, isNull } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { writeAuditLog } from '$lib/server/audit';
import { getDb, schema } from '$lib/server/modules/legacy-db';

const MANUAL_BOX_KEYS = ['gst_box9_manual', 'gst_box10_manual', 'gst_box11_manual', 'gst_box12_manual'] as const;

type ManualBoxKey = (typeof MANUAL_BOX_KEYS)[number];

function getDefaultQuarter() {
	const now = new Date();
	const year = now.getUTCFullYear();
	const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
	return { year, quarter };
}

export const load: PageServerLoad = async ({ platform, url }) => {
	const fallback = getDefaultQuarter();
	const year = Number.parseInt(url.searchParams.get('year') ?? `${fallback.year}`, 10);
	const quarter = Number.parseInt(url.searchParams.get('quarter') ?? `${fallback.quarter}`, 10);
	const safeYear = Number.isFinite(year) ? year : fallback.year;
	const safeQuarter = [1, 2, 3, 4].includes(quarter) ? quarter : fallback.quarter;

	if (!platform) {
		return {
			year: safeYear,
			quarter: safeQuarter,
			values: {
				gst_box9_manual: 0,
				gst_box10_manual: 0,
				gst_box11_manual: 0,
				gst_box12_manual: 0
			}
		};
	}

	const db = getDb(platform.env);
	const rows = await db
		.select({ key: schema.companySettings.key, value: schema.companySettings.value })
		.from(schema.companySettings)
		.where(
			and(inArray(schema.companySettings.key, [...MANUAL_BOX_KEYS]), isNull(schema.companySettings.deletedAt))
		);

	const valueMap = new Map(rows.map((row) => [row.key, Number.parseFloat(row.value)]));
	return {
		year: safeYear,
		quarter: safeQuarter,
		values: {
			gst_box9_manual: valueMap.get('gst_box9_manual') ?? 0,
			gst_box10_manual: valueMap.get('gst_box10_manual') ?? 0,
			gst_box11_manual: valueMap.get('gst_box11_manual') ?? 0,
			gst_box12_manual: valueMap.get('gst_box12_manual') ?? 0
		}
	};
};

export const actions: Actions = {
	default: async ({ request, platform, locals }) => {
		if (!platform) {
			return fail(500, { message: 'Cloudflare platform bindings are required' });
		}

		const form = await request.formData();
		const db = getDb(platform.env);
		const now = new Date().toISOString();
		const year = Number.parseInt(String(form.get('year') ?? ''), 10);
		const quarter = Number.parseInt(String(form.get('quarter') ?? ''), 10);
		if (!Number.isFinite(year) || ![1, 2, 3, 4].includes(quarter)) {
			return fail(400, { message: 'Invalid year or quarter' });
		}

		for (const key of MANUAL_BOX_KEYS) {
			const raw = String(form.get(key) ?? '0');
			const value = Number.parseFloat(raw);
			const normalized = Number.isFinite(value) ? value : 0;

			const [existing] = await db
				.select({ key: schema.companySettings.key })
				.from(schema.companySettings)
				.where(eq(schema.companySettings.key, key))
				.limit(1);

			if (existing) {
				await db
					.update(schema.companySettings)
					.set({
						value: `${normalized}`,
						deletedAt: null,
						updatedAt: now
					})
					.where(eq(schema.companySettings.key, key));
			} else {
				await db.insert(schema.companySettings).values({
					key: key as ManualBoxKey,
					value: `${normalized}`,
					createdAt: now,
					updatedAt: now
				});
			}
		}

		await writeAuditLog(platform, locals.user, {
			action: 'tax.manual_boxes.update',
			entityType: 'tax_settings',
			entityId: `gst_${year}_q${quarter}`,
			metadata: {
				year,
				quarter,
				values: Object.fromEntries(
					MANUAL_BOX_KEYS.map((key) => [key, Number.parseFloat(String(form.get(key) ?? '0')) || 0])
				)
			}
		});

		return { ok: true, year, quarter };
	}
};
