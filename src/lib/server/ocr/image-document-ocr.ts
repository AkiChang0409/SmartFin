import { runWorkersVisionOcr, type WorkersVisionOcrResult } from './workers-vision-ocr';
import type { ExpenseCategory, ExpenseDocType, ExpenseType } from '$lib/constants/expense-upload';

export async function runImageDocumentOcr(
	env: Env,
	input: {
		imageBytes: Uint8Array;
		mimeType: string;
		fileName: string;
		guidance?: {
			expenseType?: ExpenseType;
			category?: ExpenseCategory;
			docType?: ExpenseDocType | null;
		};
	}
): Promise<WorkersVisionOcrResult> {
	return runWorkersVisionOcr(env, {
		imageBytes: input.imageBytes,
		mimeType: input.mimeType,
		guidance: input.guidance
	});
}
