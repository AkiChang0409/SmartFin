/**
 * @deprecated Import from '$lib/server/modules/employee/service' instead.
 * Re-exports for backward compatibility with existing route handlers.
 */
export { periodCalendarMonth } from '$lib/server/modules/employee/service';

import { and, eq, isNull, or } from 'drizzle-orm';
import type { DBClient } from '$lib/server/db';
import { schema } from '$lib/server/db';
import { periodCalendarMonth } from '$lib/server/modules/employee/service';

function monthStart(ym: string): string {
	return `${ym}-01`;
}

function sameCalendarMonth(isoDate: string | null | undefined, ym: string): boolean {
	if (!isoDate) return false;
	return periodCalendarMonth(isoDate) === ym;
}

export async function runSettleManualProjectComponentsForMonth(params: {
	db: DBClient;
	projectId: string;
	peId: string;
	monthYm: string;
}): Promise<number> {
	const { db, projectId, peId, monthYm } = params;
	if (!/^\d{4}-\d{2}$/.test(monthYm)) return 0;

	const components = await db
		.select()
		.from(schema.compensationComponents)
		.where(
			and(
				eq(schema.compensationComponents.projectEmployeeId, peId),
				or(eq(schema.compensationComponents.origin, 'manual'), isNull(schema.compensationComponents.origin)),
				isNull(schema.compensationComponents.deletedAt)
			)
		);

	const period = monthStart(monthYm);
	const now = new Date().toISOString();
	let lines = 0;

	for (const c of components) {
		if (c.frequency !== 'monthly' && c.frequency !== 'one_off') continue;
		if (c.frequency === 'monthly') {
			if (c.effectiveFrom > period) continue;
			if (c.effectiveTo && c.effectiveTo < period) continue;
		} else if (c.frequency === 'one_off') {
			if (!sameCalendarMonth(c.effectiveFrom, monthYm)) continue;
		}
		const amount = c.value ?? 0;
		const taxableAmount = c.taxable ? amount : 0;
		const note = `Project component settlement (${monthYm})`;

		const [existing] = await db
			.select({ id: schema.payoutRecords.id })
			.from(schema.payoutRecords)
			.where(
				and(
					eq(schema.payoutRecords.componentId, c.id),
					eq(schema.payoutRecords.projectId, projectId),
					eq(schema.payoutRecords.period, period),
					eq(schema.payoutRecords.source, 'settlement'),
					isNull(schema.payoutRecords.deletedAt)
				)
			)
			.limit(1);

		if (existing) {
			await db
				.update(schema.payoutRecords)
				.set({
					baseValue: amount,
					computedAmount: amount,
					taxableAmount,
					status: 'confirmed',
					note,
					updatedAt: now
				})
				.where(eq(schema.payoutRecords.id, existing.id));
		} else {
			await db.insert(schema.payoutRecords).values({
				id: crypto.randomUUID(),
				componentId: c.id,
				projectId,
				period,
				baseValue: amount,
				computedAmount: amount,
				cpfEmployee: 0,
				cpfEmployer: 0,
				taxableAmount,
				status: 'confirmed',
				source: 'settlement',
				note,
				createdAt: now,
				updatedAt: now
			});
		}
		lines += 1;
	}

	return lines;
}
