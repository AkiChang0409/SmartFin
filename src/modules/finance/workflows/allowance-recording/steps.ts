import { validateExpenseDraftCapability } from '../../capabilities/validate-expense-draft';
import type { FinanceCapabilityContext } from '../../capabilities/types';
import type { FinanceValidationIssue } from '../../agent/types';
import {
	allowanceManualEntrySchema,
	computeAllowanceTotal,
	type AllowanceConfirmationPayload,
	type AllowanceManualEntry
} from './schemas';

export interface ManualEntryStepInput extends AllowanceManualEntry {}

export interface ManualEntryStepOutput {
	entry: AllowanceManualEntry;
	totalAmount: number;
}

/** Validates the user-entered allowance form and computes the derived total. */
export async function runManualEntryStep(
	input: ManualEntryStepInput
): Promise<ManualEntryStepOutput> {
	const parsed = allowanceManualEntrySchema.parse(input);
	return {
		entry: parsed,
		totalAmount: computeAllowanceTotal({ days: parsed.days, dailyRate: parsed.dailyRate })
	};
}

export interface AllowanceValidateStepOutput {
	ok: boolean;
	issues: FinanceValidationIssue[];
	payload: AllowanceConfirmationPayload;
}

/** Maps the allowance form into the canonical expense record shape and runs
 *  the deterministic expense-draft validator. The validator is the same one
 *  used by financial-document-intake, so a successful allowance + a successful
 *  invoice both pass through the same business-rule gate before R4 write. */
export async function runAllowanceValidateStep(
	input: AllowanceConfirmationPayload,
	ctx: FinanceCapabilityContext
): Promise<AllowanceValidateStepOutput> {
	const expensePayload = {
		expenseType: 'opex' as const,
		category: 'allowance',
		amount: input.totalAmount,
		currency: input.currency,
		date: input.dateStart
	};
	const result = await validateExpenseDraftCapability.execute(expensePayload, ctx);
	return {
		ok: result.ok,
		issues: result.issues,
		payload: input
	};
}
