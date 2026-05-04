import { z } from 'zod';

export const allowanceManualEntrySchema = z.object({
	staffName: z.string().min(1),
	destination: z.string().min(1),
	dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected'),
	dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected'),
	days: z.number().int().min(1).max(365),
	dailyRate: z.number().finite().min(0),
	currency: z.string().min(1).default('SGD'),
	notes: z.string().optional()
});

export type AllowanceManualEntry = z.infer<typeof allowanceManualEntrySchema>;

export const allowanceConfirmationSchema = allowanceManualEntrySchema.extend({
	totalAmount: z.number().finite().min(0)
});

export type AllowanceConfirmationPayload = z.infer<typeof allowanceConfirmationSchema>;

export function computeAllowanceTotal(input: { days: number; dailyRate: number }): number {
	return Math.round(input.days * input.dailyRate * 100) / 100;
}
